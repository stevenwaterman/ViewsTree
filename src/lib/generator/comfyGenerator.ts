import type { Writable } from "svelte/store";
import { saveStore } from "../persistence/saves";
import {
  createImgImgNode,
  type ImgImgResult,
} from "../state/nodeTypes/imgImgNodes";
import {
  createInpaintNode,
  type InpaintResult,
} from "../state/nodeTypes/inpaintNodes";
import {
  createMaskNode,
  type MaskResult,
  type MaskRequest,
} from "../state/nodeTypes/maskNodes";
import {
  createUploadNode,
  type UploadRequest,
} from "../state/nodeTypes/uploadNode";
import {
  modelsHash,
  type AnyNode,
  type BranchNode,
} from "../state/nodeTypes/nodes";
import type { RootNode } from "../state/nodeTypes/rootNodes";
import {
  createTxtImgNode,
  type TxtImgResult,
} from "../state/nodeTypes/txtImgNodes";
import { type GenerationSettings, randomSeed } from "../state/settings";
import { getComfyClient } from "./comfyClient";

export type GenerationRequest = {
  modelsHash: string;
  fire: () => Promise<void>;
  cancel: () => void;
};

function getComfyFilename(imageInfo: { filename: string; subfolder: string }): string {
    return imageInfo.subfolder 
        ? `${imageInfo.subfolder}/${imageInfo.filename}`
        : imageInfo.filename;
}

/**
 * Returns a node definition for loading an image based on its type.
 */
function getLoaderNode(imageInfo: { filename: string; subfolder: string; type: string }) {
    if (imageInfo.type === 'output') {
        return {
            inputs: { image: `${getComfyFilename(imageInfo)} [output]` },
            class_type: "LoadImageOutput"
        };
    } else {
        return {
            inputs: { image: imageInfo.filename, upload: "image" },
            class_type: "LoadImage"
        };
    }
}

/**
 * Adds LoRA loaders to the workflow, chaining them together.
 * Returns the IDs of the final model and clip outputs.
 */
function addLorasToWorkflow(
    workflow: any, 
    loras: { name: string; strength: number }[], 
    baseModelId: string, 
    baseClipId: string
): { model: [string, number], clip: [string, number] } {
    let lastModelId = baseModelId;
    let lastClipId = baseClipId;
    let lastModelOut = 0;
    let lastClipOut = 0;

    loras.forEach((lora, index) => {
        const nodeId = `lora_${index}`;
        workflow[nodeId] = {
            inputs: {
                lora_name: lora.name,
                strength_model: lora.strength,
                strength_clip: lora.strength,
                model: [lastModelId, lastModelOut],
                clip: [lastClipId, lastClipOut]
            },
            class_type: "LoraLoader"
        };
        lastModelId = nodeId;
        lastClipId = nodeId;
        lastModelOut = 0;
        lastClipOut = 1;
    });

    return { 
        model: [lastModelId, lastModelOut], 
        clip: [lastClipId, lastClipOut] 
    };
}

async function runGeneration<T extends BranchNode>(
  pendingRequests: Writable<{
    requests: GenerationRequest[];
    running: boolean;
  }>,
  modelsHashValue: string,
  reqFn: (abortController: AbortController) => Promise<T>
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const abortController = new AbortController();
    let cancelled = false;
    
    const generationRequest: GenerationRequest = {
      modelsHash: modelsHashValue,
      fire: async () => {},
      cancel: () => {
        cancelled = true;
        abortController.abort();
        pendingRequests.update(({ requests, running }) => ({
          requests: requests.filter((req) => req !== generationRequest),
          running,
        }));
        reject("Cancelled");
      },
    };

    pendingRequests.update(({ requests, running }) => ({
      requests: [...requests, generationRequest],
      running: true,
    }));

    (async () => {
      try {
        const node = await reqFn(abortController);
        if (!cancelled) {
          (node.parent.children as Writable<any[]>).update((children) => [
            ...children,
            node,
          ]);
          saveStore.save();
          resolve(node);
        }
      } catch (e) {
        if (!cancelled) {
            console.error("Generation failed", e);
            reject(e);
        }
      } finally {
        pendingRequests.update(({ requests }) => {
          const newRequests = requests.filter((req) => req !== generationRequest);
          return {
            requests: newRequests,
            running: newRequests.length > 0,
          };
        });
      }
    })();
  });
}

export async function queueTxtImg(
  _saveName: string,
  request: GenerationSettings,
  parent: RootNode
) {
  const clonedRequest = JSON.parse(JSON.stringify(request));
  const hash = modelsHash(clonedRequest);
  
  return runGeneration(parent.pendingRequests, hash, async (abortController) => {
    const client = getComfyClient();
    const seed = clonedRequest.seed ?? randomSeed();
    const scale = clonedRequest.supportsCfg === false ? 1 : clonedRequest.scale;
    const negativePrompt = clonedRequest.supportsCfg === false ? "" : clonedRequest.negativePrompt;

    const workflow: any = {
      "10": {
        inputs: {
          unet_name: clonedRequest.checkpoint,
          weight_dtype: clonedRequest.unet_weight_dtype,
        },
        class_type: "UNETLoader",
      },
      "11": {
        inputs: {
          clip_name: clonedRequest.clip,
          type: clonedRequest.clip_type,
        },
        class_type: "CLIPLoader",
      },
      "12": {
        inputs: {
          vae_name: clonedRequest.vae,
        },
        class_type: "VAELoader",
      },
      "5": {
        inputs: {
          width: clonedRequest.width,
          height: clonedRequest.height,
          batch_size: 1,
        },
        class_type: "EmptyLatentImage",
      },
      "8": {
        inputs: {
          samples: ["3", 0],
          vae: ["12", 0],
        },
        class_type: "VAEDecode",
      },
      "9": {
        inputs: {
          filename_prefix: "ViewsTree",
          images: ["8", 0],
        },
        class_type: "SaveImage",
      },
    };

    const { model, clip } = addLorasToWorkflow(workflow, clonedRequest.loras, "10", "11");

    workflow["6"] = {
      inputs: {
        text: clonedRequest.prompt,
        clip: clip,
      },
      class_type: "CLIPTextEncode",
    };
    workflow["7"] = {
      inputs: {
        text: negativePrompt,
        clip: clip,
      },
      class_type: "CLIPTextEncode",
    };
    workflow["3"] = {
      inputs: {
        seed: seed,
        steps: clonedRequest.steps,
        cfg: scale,
        sampler_name: clonedRequest.sampler_name,
        scheduler: clonedRequest.scheduler,
        denoise: 1,
        model: model,
        positive: ["6", 0],
        negative: ["7", 0],
        latent_image: ["5", 0],
      },
      class_type: "KSampler",
    };

    const promptRes = await client.queuePrompt(null, workflow);
    const output = await waitForNodeOutput(promptRes.prompt_id, "9", abortController);
    const imageInfo = output.images[0];

    return createTxtImgNode(
      {
        ...clonedRequest,
        id: promptRes.prompt_id,
        seed: {
          random: clonedRequest.seed === undefined,
          actual: seed,
        },
        comfyImage: imageInfo,
      },
      parent
    );
  });
}

export async function queueImgImg(
  _saveName: string,
  request: GenerationSettings,
  parent: BranchNode
) {
  const clonedRequest = JSON.parse(JSON.stringify(request));
  const hash = modelsHash(clonedRequest);
  
  return runGeneration(parent.pendingRequests, hash, async (abortController) => {
    const client = getComfyClient();
    const seed = clonedRequest.seed ?? randomSeed();
    const scale = clonedRequest.supportsCfg === false ? 1 : clonedRequest.scale;
    const negativePrompt = clonedRequest.supportsCfg === false ? "" : clonedRequest.negativePrompt;

    if (!parent.comfyImage) {
        throw new Error("Parent node has no image info for Img2Img");
    }

    const workflow: any = {
      "10": {
        inputs: {
          unet_name: clonedRequest.checkpoint,
          weight_dtype: clonedRequest.unet_weight_dtype,
        },
        class_type: "UNETLoader",
      },
      "11": {
        inputs: {
          clip_name: clonedRequest.clip,
          type: clonedRequest.clip_type,
        },
        class_type: "CLIPLoader",
      },
      "12": {
        inputs: {
          vae_name: clonedRequest.vae,
        },
        class_type: "VAELoader",
      },
      "13": getLoaderNode(parent.comfyImage),
      "20": {
        inputs: {
            image: ["13", 0],
            upscale_method: "lanczos",
            width: clonedRequest.width,
            height: clonedRequest.height,
            crop: "disabled"
        },
        class_type: "ImageScale"
      },
      "14": {
        inputs: {
          pixels: ["20", 0],
          vae: ["12", 0]
        },
        class_type: "VAEEncode"
      },
      "8": {
        inputs: {
          samples: ["3", 0],
          vae: ["12", 0],
        },
        class_type: "VAEDecode",
      },
      "9": {
        inputs: {
          filename_prefix: "ViewsTree_Img2Img",
          images: ["8", 0],
        },
        class_type: "SaveImage",
      },
    };

    const { model, clip } = addLorasToWorkflow(workflow, clonedRequest.loras, "10", "11");

    workflow["6"] = {
      inputs: {
        text: clonedRequest.prompt,
        clip: clip,
      },
      class_type: "CLIPTextEncode",
    };
    workflow["7"] = {
      inputs: {
        text: negativePrompt,
        clip: clip,
      },
      class_type: "CLIPTextEncode",
    };
    workflow["3"] = {
      inputs: {
        seed: seed,
        steps: clonedRequest.steps,
        cfg: scale,
        sampler_name: clonedRequest.sampler_name,
        scheduler: clonedRequest.scheduler,
        denoise: clonedRequest.strength,
        model: model,
        positive: ["6", 0],
        negative: ["7", 0],
        latent_image: ["14", 0],
      },
      class_type: "KSampler",
    };

    const promptRes = await client.queuePrompt(null, workflow);
    const output = await waitForNodeOutput(promptRes.prompt_id, "9", abortController);
    const imageInfo = output.images[0];

    return createImgImgNode(
      {
        ...clonedRequest,
        id: promptRes.prompt_id,
        seed: {
          random: clonedRequest.seed === undefined,
          actual: seed,
        },
        comfyImage: imageInfo,
      },
      parent
    );
  });
}

export async function queueInpaint(
  _saveName: string,
  request: GenerationSettings,
  parent: BranchNode
) {
  const clonedRequest = JSON.parse(JSON.stringify(request));
  const hash = modelsHash(clonedRequest);
  
  return runGeneration(parent.pendingRequests, hash, async (abortController) => {
    const client = getComfyClient();
    const seed = clonedRequest.seed ?? randomSeed();
    const scale = clonedRequest.supportsCfg === false ? 1 : clonedRequest.scale;
    const negativePrompt = clonedRequest.supportsCfg === false ? "" : clonedRequest.negativePrompt;

    const maskNode = parent as any;
    if (maskNode.type !== 'Mask') throw new Error("Parent of Inpaint must be a Mask node");
    
    const imageNode = maskNode.parent;
    if (!imageNode.comfyImage) throw new Error("Grandparent node has no image info for Inpaint");

    const workflow: any = {
      "10": {
        inputs: {
          unet_name: clonedRequest.checkpoint,
          weight_dtype: clonedRequest.unet_weight_dtype,
        },
        class_type: "UNETLoader",
      },
      "11": {
        inputs: {
          clip_name: clonedRequest.clip,
          type: clonedRequest.clip_type,
        },
        class_type: "CLIPLoader",
      },
      "12": {
        inputs: {
          vae_name: clonedRequest.vae,
        },
        class_type: "VAELoader",
      },
      "13": getLoaderNode(imageNode.comfyImage),
      "20": {
        inputs: {
            image: ["13", 0],
            upscale_method: "lanczos",
            width: clonedRequest.width,
            height: clonedRequest.height,
            crop: "disabled"
        },
        class_type: "ImageScale"
      },
      "16": {
        inputs: {
          image: maskNode.comfyImage.filename,
          upload: "image"
        },
        class_type: "LoadImage"
      },
      "21": {
        inputs: {
            image: ["16", 0],
            upscale_method: "lanczos",
            width: clonedRequest.width,
            height: clonedRequest.height,
            crop: "disabled"
        },
        class_type: "ImageScale"
      },
      "22": {
        inputs: {
            image: ["21", 0],
            channel: "red"
        },
        class_type: "ImageToMask"
      },
      "19": {
        inputs: {
            mask: ["22", 0]
        },
        class_type: "InvertMask"
      },
      "8": {
        inputs: {
          samples: ["3", 0],
          vae: ["12", 0],
        },
        class_type: "VAEDecode",
      },
      "9": {
        inputs: {
          filename_prefix: "ViewsTree_Inpaint",
          images: ["8", 0],
        },
        class_type: "SaveImage",
      },
    };

    const { model, clip } = addLorasToWorkflow(workflow, clonedRequest.loras, "10", "11");

    workflow["15"] = {
      inputs: {
        model: model
      },
      class_type: "DifferentialDiffusion"
    };
    workflow["6"] = {
      inputs: {
        text: clonedRequest.prompt,
        clip: clip,
      },
      class_type: "CLIPTextEncode",
    };
    workflow["7"] = {
      inputs: {
        text: negativePrompt,
        clip: clip,
      },
      class_type: "CLIPTextEncode",
    };
    workflow["18"] = {
      inputs: {
        positive: ["6", 0],
        negative: ["7", 0],
        vae: ["12", 0],
        pixels: ["20", 0],
        mask: ["19", 0],
        noise_mask: true
      },
      class_type: "InpaintModelConditioning"
    };
    workflow["3"] = {
      inputs: {
        seed: seed,
        steps: clonedRequest.steps,
        cfg: scale,
        sampler_name: clonedRequest.sampler_name,
        scheduler: clonedRequest.scheduler,
        denoise: clonedRequest.strength,
        model: ["15", 0],
        positive: ["18", 0],
        negative: ["18", 1],
        latent_image: ["18", 2],
      },
      class_type: "KSampler",
    };

    const promptRes = await client.queuePrompt(null, workflow);
    const output = await waitForNodeOutput(promptRes.prompt_id, "9", abortController);
    const imageInfo = output.images[0];

    return createInpaintNode(
      {
        ...clonedRequest,
        id: promptRes.prompt_id,
        seed: {
          random: clonedRequest.seed === undefined,
          actual: seed,
        },
        comfyImage: imageInfo,
      },
      parent
    );
  });
}

export async function sendMask(
  _saveName: string,
  request: MaskRequest,
  parent: BranchNode
): Promise<void> {
    const client = getComfyClient();
    const response = await fetch(request.image);
    const blob = await response.blob();
    
    const uploadRes = await client.uploadImage(blob, `mask_${Date.now()}.png`);
    if (!uploadRes) throw new Error("Failed to upload mask");

    const maskNode = createMaskNode({
        id: `mask_${uploadRes.info.filename}`,
        width: request.width,
        height: request.height,
        comfyImage: uploadRes.info
    }, parent);

    parent.children.update(children => [...children, maskNode]);
    saveStore.save();
}

export async function sendUpload(
  _saveName: string,
  request: UploadRequest,
  rootNode: RootNode
): Promise<void> {
    const client = getComfyClient();
    const croppedBlob = await cropImage(request.image, request.crop, request.width, request.height);
    
    const uploadRes = await client.uploadImage(croppedBlob, `upload_${Date.now()}.png`);
    if (!uploadRes) throw new Error("Failed to upload image");

    const uploadNode = createUploadNode({
        id: `upload_${uploadRes.info.filename}`,
        width: request.width,
        height: request.height,
        comfyImage: uploadRes.info
    }, rootNode);

    rootNode.children.update(children => [...children, uploadNode]);
    saveStore.save();
}

async function cropImage(
    dataUrl: string, 
    crop: { top: number; right: number; bottom: number; left: number },
    targetWidth: number,
    targetHeight: number
): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error("Could not get canvas context"));
                return;
            }
            const sourceX = crop.left;
            const sourceY = crop.top;
            const sourceWidth = crop.right - crop.left;
            const sourceHeight = crop.bottom - crop.top;
            ctx.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, targetWidth, targetHeight);
            canvas.toBlob((blob) => {
                if (blob) resolve(blob);
                else reject(new Error("Canvas to blob failed"));
            }, 'image/png');
        };
        img.onerror = () => reject(new Error("Failed to load image for cropping"));
        img.src = dataUrl;
    });
}

async function waitForNodeOutput(promptId: string, nodeId: string, abortController: AbortController): Promise<any> {
  const client = getComfyClient();
  
  return new Promise((resolve, reject) => {
    const cleanups: Array<() => void> = [];
    const cleanup = () => cleanups.forEach(c => c());

    const onExecuted = (ev: any) => {
      if (ev.detail.prompt_id === promptId && ev.detail.node === nodeId) {
        cleanup();
        resolve(ev.detail.output);
      }
    };

    const onExecutionError = (ev: any) => {
        if (ev.detail.prompt_id === promptId) {
            cleanup();
            reject(new Error(ev.detail.exception_message || "Execution Error"));
        }
    };

    const onExecutionCached = (ev: any) => {
        if (ev.detail.prompt_id === promptId && ev.detail.nodes.includes(nodeId)) {
            cleanup();
            client.getHistory(promptId).then(history => {
                if (history && history.outputs[nodeId]) {
                    resolve(history.outputs[nodeId]);
                } else {
                    reject(new Error("Cached but no history found"));
                }
            });
        }
    };

    cleanups.push(client.on("executed", onExecuted));
    cleanups.push(client.on("execution_error", onExecutionError));
    cleanups.push(client.on("execution_cached", onExecutionCached));

    abortController.signal.addEventListener("abort", () => {
      cleanup();
      reject(new Error("Cancelled"));
    });

    const timeout = setTimeout(async () => {
        const history = await client.getHistory(promptId);
        if (history && history.outputs[nodeId]) {
            cleanup();
            resolve(history.outputs[nodeId]);
        }
    }, 30000); 
    cleanups.push(() => clearTimeout(timeout));
  });
}

export function imageUrl(_saveName: string, node: BranchNode): string {
  if (node.comfyImage) {
    return getComfyClient().getPathImage(node.comfyImage);
  }
  return "";
}

export function thumbnailUrl(_saveName: string, node: BranchNode): string {
  if (node.comfyImage) {
    return getComfyClient().getPathImage(node.comfyImage);
  }
  return "";
}

export function cancelRequest(node: AnyNode): void {
  const pendingRequests = node.pendingRequests.state;
  if (pendingRequests.requests.length === 0) return;

  const lastReq = pendingRequests.requests[pendingRequests.requests.length - 1];
  lastReq.cancel();
  getComfyClient().interrupt();
}

export function copyRequest<T extends Partial<GenerationSettings>>(
  request: T
): T {
  return JSON.parse(JSON.stringify(request));
}