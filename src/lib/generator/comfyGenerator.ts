import type { Writable } from "svelte/store";
import { PromptBuilder, CallWrapper } from "@saintno/comfyui-sdk";
import { saveStore } from "../persistence/saves";
import {
  createImgImgNode,
  type ImgImgResult,
} from "../state/nodeTypes/imgImgNodes";
import {
  createInpaintNode,
  type InpaintResult,
} from "../state/nodeTypes/inpaintNodes";
import { createMaskNode, type MaskRequest } from "../state/nodeTypes/maskNodes";
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
  promptId?: string;
  cancel: () => void;
};

/**
 * Common input keys for all generation workflows
 */
type CommonInputKeys =
  | "checkpoint"
  | "unet_weight_dtype"
  | "clip"
  | "clip_type"
  | "vae"
  | "width"
  | "height"
  | "seed"
  | "steps"
  | "cfg"
  | "sampler"
  | "scheduler"
  | "prompt"
  | "negative";

function getComfyFilename(imageInfo: {
  filename: string;
  subfolder: string;
}): string {
  return imageInfo.subfolder
    ? `${imageInfo.subfolder}/${imageInfo.filename}`
    : imageInfo.filename;
}

/**
 * Returns a node definition for loading an image based on its type.
 */
function getLoaderNode(imageInfo: {
  filename: string;
  subfolder: string;
  type: string;
}) {
  if (imageInfo.type === "output") {
    return {
      inputs: { image: `${getComfyFilename(imageInfo)} [output]` },
      class_type: "LoadImageOutput",
      _meta: { title: "Load Image" },
    };
  } else {
    return {
      inputs: { image: imageInfo.filename, upload: "image" },
      class_type: "LoadImage",
      _meta: { title: "Load Image" },
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
  baseClipId: string,
): { model: [string, number]; clip: [string, number] } {
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
        clip: [lastClipId, lastClipOut],
      },
      class_type: "LoraLoader",
      _meta: { title: `LoRA ${index}` },
    };
    lastModelId = nodeId;
    lastClipId = nodeId;
    lastModelOut = 0;
    lastClipOut = 1;
  });

  return {
    model: [lastModelId, lastModelOut],
    clip: [lastClipId, lastClipOut],
  };
}

/**
 * Main generation runner using CallWrapper
 */
async function runGeneration<T extends BranchNode>(
  pendingRequests: Writable<{
    requests: GenerationRequest[];
    running: boolean;
  }>,
  modelsHashValue: string,
  builder: PromptBuilder<any, any, any>,
  createNodeFn: (seed: number, imageInfo: any) => T,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const api = getComfyClient();
    let cancelled = false;
    let promptId: string | undefined;
    let isRunning = false;

    const performCancel = async () => {
      if (!promptId) return;

      // 1. Always try to delete from queue
      await api.fetchApi("/queue", {
        method: "POST",
        body: JSON.stringify({ delete: [promptId] }),
        headers: { "Content-Type": "application/json" },
      });

      // 2. Check if it's currently running on the server.
      // This handles the race condition where it started running but 'executing' 
      // event hasn't reached the client yet.
      try {
        const queue = await api.getQueue();
        const isRunningOnServer = queue.queue_running.some(
          (item) => item[1] === promptId,
        );

        if (isRunningOnServer || isRunning) {
          await api.interrupt();
        }
      } catch (e) {
        // Fallback if queue check fails
        if (isRunning) await api.interrupt();
      }
    };

    const generationRequest: GenerationRequest = {
      modelsHash: modelsHashValue,
      cancel: async () => {
        cancelled = true;
        await performCancel();

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
      const cleanups: (() => void)[] = [];
      try {
        const runner = new CallWrapper(api, builder);

        runner.onPending((id) => {
          promptId = id;
          generationRequest.promptId = id;
          // If we were cancelled before the ID was even returned from the server,
          // we must delete it now.
          if (cancelled) performCancel();
        });

        // The 'executing' event is the earliest indicator that our prompt is on the GPU
        const offExecuting = api.on("executing", (ev) => {
          if (ev.detail.prompt_id === promptId) {
            isRunning = true;
          }
        });
        cleanups.push(offExecuting);

        // Backup: 'onStart' fires on the first progress event (usually sampling)
        runner.onStart(() => {
          isRunning = true;
        });

        const result = await runner.run();

        if (cancelled) return;

        if (result) {
          const imageInfo = result.images.images[0];
          const actualSeed = builder.workflow["3"].inputs.seed;
          const node = createNodeFn(actualSeed, imageInfo);

          (node.parent.children as Writable<any[]>).update((children) => [
            ...children,
            node,
          ]);
          saveStore.save();
          resolve(node);
        } else {
          // If result is false but not cancelled, it was likely interrupted by another request
          reject("Interrupted or Failed");
        }
      } catch (e) {
        if (!cancelled) {
          console.error("Generation failed", e);
          reject(e);
        }
      } finally {
        cleanups.forEach((c) => c());
        pendingRequests.update(({ requests }) => {
          const newRequests = requests.filter(
            (req) => req !== generationRequest,
          );
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
  parent: RootNode,
) {
  const clonedRequest = JSON.parse(JSON.stringify(request));
  const hash = modelsHash(clonedRequest);
  const seed = clonedRequest.seed ?? randomSeed();
  const scale = clonedRequest.supportsCfg === false ? 1 : clonedRequest.scale;
  const negativePrompt =
    clonedRequest.supportsCfg === false ? "" : clonedRequest.negativePrompt;

  const workflow: any = {
    "10": {
      inputs: {
        unet_name: clonedRequest.checkpoint,
        weight_dtype: clonedRequest.unet_weight_dtype,
      },
      class_type: "UNETLoader",
      _meta: { title: "UNET" },
    },
    "11": {
      inputs: { clip_name: clonedRequest.clip, type: clonedRequest.clip_type },
      class_type: "CLIPLoader",
      _meta: { title: "CLIP" },
    },
    "12": {
      inputs: { vae_name: clonedRequest.vae },
      class_type: "VAELoader",
      _meta: { title: "VAE" },
    },
    "5": {
      inputs: {
        width: clonedRequest.width,
        height: clonedRequest.height,
        batch_size: 1,
      },
      class_type: "EmptyLatentImage",
      _meta: { title: "Latent" },
    },
    "8": {
      inputs: { samples: ["3", 0], vae: ["12", 0] },
      class_type: "VAEDecode",
      _meta: { title: "Decode" },
    },
    "9": {
      inputs: { filename_prefix: "ViewsTree", images: ["8", 0] },
      class_type: "SaveImage",
      _meta: { title: "Save" },
    },
  };

  const { model, clip } = addLorasToWorkflow(
    workflow,
    clonedRequest.loras,
    "10",
    "11",
  );

  workflow["6"] = {
    inputs: { text: clonedRequest.prompt, clip: clip },
    class_type: "CLIPTextEncode",
    _meta: { title: "Pos" },
  };
  workflow["7"] = {
    inputs: { text: negativePrompt, clip: clip },
    class_type: "CLIPTextEncode",
    _meta: { title: "Neg" },
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
    _meta: { title: "Sampler" },
  };

  const builder = new PromptBuilder(workflow, [], ["images"]).setOutputNode(
    "images",
    "9",
  );

  return runGeneration(
    parent.pendingRequests,
    hash,
    builder,
    (actualSeed, imageInfo) =>
      createTxtImgNode(
        {
          ...clonedRequest,
          id: promptIdForNode(imageInfo),
          seed: {
            random: clonedRequest.seed === undefined,
            actual: actualSeed,
          },
          comfyImage: imageInfo,
        },
        parent,
      ),
  );
}

export async function queueImgImg(
  _saveName: string,
  request: GenerationSettings,
  parent: BranchNode,
) {
  const clonedRequest = JSON.parse(JSON.stringify(request));
  const hash = modelsHash(clonedRequest);
  const seed = clonedRequest.seed ?? randomSeed();
  const scale = clonedRequest.supportsCfg === false ? 1 : clonedRequest.scale;
  const negativePrompt =
    clonedRequest.supportsCfg === false ? "" : clonedRequest.negativePrompt;

  if (!parent.comfyImage)
    throw new Error("Parent node has no image info for Img2Img");

  const workflow: any = {
    "10": {
      inputs: {
        unet_name: clonedRequest.checkpoint,
        weight_dtype: clonedRequest.unet_weight_dtype,
      },
      class_type: "UNETLoader",
      _meta: { title: "UNET" },
    },
    "11": {
      inputs: { clip_name: clonedRequest.clip, type: clonedRequest.clip_type },
      class_type: "CLIPLoader",
      _meta: { title: "CLIP" },
    },
    "12": {
      inputs: { vae_name: clonedRequest.vae },
      class_type: "VAELoader",
      _meta: { title: "VAE" },
    },
    "13": getLoaderNode(parent.comfyImage),
    "20": {
      inputs: {
        image: ["13", 0],
        upscale_method: "lanczos",
        width: clonedRequest.width,
        height: clonedRequest.height,
        crop: "disabled",
      },
      class_type: "ImageScale",
      _meta: { title: "Scale" },
    },
    "14": {
      inputs: { pixels: ["20", 0], vae: ["12", 0] },
      class_type: "VAEEncode",
      _meta: { title: "Encode" },
    },
    "8": {
      inputs: { samples: ["3", 0], vae: ["12", 0] },
      class_type: "VAEDecode",
      _meta: { title: "Decode" },
    },
    "9": {
      inputs: { filename_prefix: "ViewsTree_Img2Img", images: ["8", 0] },
      class_type: "SaveImage",
      _meta: { title: "Save" },
    },
  };

  const { model, clip } = addLorasToWorkflow(
    workflow,
    clonedRequest.loras,
    "10",
    "11",
  );

  workflow["6"] = {
    inputs: { text: clonedRequest.prompt, clip: clip },
    class_type: "CLIPTextEncode",
    _meta: { title: "Pos" },
  };
  workflow["7"] = {
    inputs: { text: negativePrompt, clip: clip },
    class_type: "CLIPTextEncode",
    _meta: { title: "Neg" },
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
    _meta: { title: "Sampler" },
  };

  const builder = new PromptBuilder(workflow, [], ["images"]).setOutputNode(
    "images",
    "9",
  );

  return runGeneration(
    parent.pendingRequests,
    hash,
    builder,
    (actualSeed, imageInfo) =>
      createImgImgNode(
        {
          ...clonedRequest,
          id: promptIdForNode(imageInfo),
          seed: {
            random: clonedRequest.seed === undefined,
            actual: actualSeed,
          },
          comfyImage: imageInfo,
        },
        parent,
      ),
  );
}

export async function queueInpaint(
  _saveName: string,
  request: GenerationSettings,
  parent: BranchNode,
) {
  const clonedRequest = JSON.parse(JSON.stringify(request));
  const hash = modelsHash(clonedRequest);
  const seed = clonedRequest.seed ?? randomSeed();
  const scale = clonedRequest.supportsCfg === false ? 1 : clonedRequest.scale;
  const negativePrompt =
    clonedRequest.supportsCfg === false ? "" : clonedRequest.negativePrompt;

  const maskNode = parent as any;
  if (maskNode.type !== "Mask")
    throw new Error("Parent of Inpaint must be a Mask node");

  const imageNode = maskNode.parent;
  if (!imageNode.comfyImage)
    throw new Error("Grandparent node has no image info for Inpaint");

  const workflow: any = {
    "10": {
      inputs: {
        unet_name: clonedRequest.checkpoint,
        weight_dtype: clonedRequest.unet_weight_dtype,
      },
      class_type: "UNETLoader",
      _meta: { title: "UNET" },
    },
    "11": {
      inputs: { clip_name: clonedRequest.clip, type: clonedRequest.clip_type },
      class_type: "CLIPLoader",
      _meta: { title: "CLIP" },
    },
    "12": {
      inputs: { vae_name: clonedRequest.vae },
      class_type: "VAELoader",
      _meta: { title: "VAE" },
    },
    "13": getLoaderNode(imageNode.comfyImage),
    "20": {
      inputs: {
        image: ["13", 0],
        upscale_method: "lanczos",
        width: clonedRequest.width,
        height: clonedRequest.height,
        crop: "disabled",
      },
      class_type: "ImageScale",
      _meta: { title: "Scale Image" },
    },
    "16": {
      inputs: { image: maskNode.comfyImage.filename, upload: "image" },
      class_type: "LoadImage",
      _meta: { title: "Load Mask" },
    },
    "21": {
      inputs: {
        image: ["16", 0],
        upscale_method: "lanczos",
        width: clonedRequest.width,
        height: clonedRequest.height,
        crop: "disabled",
      },
      class_type: "ImageScale",
      _meta: { title: "Scale Mask" },
    },
    "22": {
      inputs: { image: ["21", 0], channel: "red" },
      class_type: "ImageToMask",
      _meta: { title: "Image2Mask" },
    },
    "19": {
      inputs: { mask: ["22", 0] },
      class_type: "InvertMask",
      _meta: { title: "Invert" },
    },
    "8": {
      inputs: { samples: ["3", 0], vae: ["12", 0] },
      class_type: "VAEDecode",
      _meta: { title: "Decode" },
    },
    "9": {
      inputs: { filename_prefix: "ViewsTree_Inpaint", images: ["8", 0] },
      class_type: "SaveImage",
      _meta: { title: "Save" },
    },
  };

  const { model, clip } = addLorasToWorkflow(
    workflow,
    clonedRequest.loras,
    "10",
    "11",
  );

  workflow["15"] = {
    inputs: { model: model },
    class_type: "DifferentialDiffusion",
    _meta: { title: "Diff" },
  };
  workflow["6"] = {
    inputs: { text: clonedRequest.prompt, clip: clip },
    class_type: "CLIPTextEncode",
    _meta: { title: "Pos" },
  };
  workflow["7"] = {
    inputs: { text: negativePrompt, clip: clip },
    class_type: "CLIPTextEncode",
    _meta: { title: "Neg" },
  };
  workflow["18"] = {
    inputs: {
      positive: ["6", 0],
      negative: ["7", 0],
      vae: ["12", 0],
      pixels: ["20", 0],
      mask: ["19", 0],
      noise_mask: true,
    },
    class_type: "InpaintModelConditioning",
    _meta: { title: "InpaintCond" },
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
    _meta: { title: "Sampler" },
  };

  const builder = new PromptBuilder(workflow, [], ["images"]).setOutputNode(
    "images",
    "9",
  );

  return runGeneration(
    parent.pendingRequests,
    hash,
    builder,
    (actualSeed, imageInfo) =>
      createInpaintNode(
        {
          ...clonedRequest,
          id: promptIdForNode(imageInfo),
          seed: {
            random: clonedRequest.seed === undefined,
            actual: actualSeed,
          },
          comfyImage: imageInfo,
        },
        parent,
      ),
  );
}

/**
 * Simple helper to generate a node ID based on filename
 */
function promptIdForNode(imageInfo: any): string {
  return `${imageInfo.filename}_${Date.now()}`;
}

export async function sendMask(
  _saveName: string,
  request: MaskRequest,
  parent: BranchNode,
): Promise<void> {
  const client = getComfyClient();
  const response = await fetch(request.image);
  const blob = await response.blob();

  const uploadRes = await client.uploadImage(blob, `mask_${Date.now()}.png`);
  if (!uploadRes) throw new Error("Failed to upload mask");

  const maskNode = createMaskNode(
    {
      id: `mask_${uploadRes.info.filename}`,
      width: request.width,
      height: request.height,
      comfyImage: uploadRes.info,
    },
    parent,
  );

  parent.children.update((children) => [...children, maskNode]);
  saveStore.save();
}

export async function sendUpload(
  _saveName: string,
  request: UploadRequest,
  rootNode: RootNode,
): Promise<void> {
  const client = getComfyClient();
  const croppedBlob = await cropImage(
    request.image,
    request.crop,
    request.width,
    request.height,
  );

  const uploadRes = await client.uploadImage(
    croppedBlob,
    `upload_${Date.now()}.png`,
  );
  if (!uploadRes) throw new Error("Failed to upload image");

  const uploadNode = createUploadNode(
    {
      id: `upload_${uploadRes.info.filename}`,
      width: request.width,
      height: request.height,
      comfyImage: uploadRes.info,
    },
    rootNode,
  );

  rootNode.children.update((children) => [...children, uploadNode]);
  saveStore.save();
}

async function cropImage(
  dataUrl: string,
  crop: { top: number; right: number; bottom: number; left: number },
  targetWidth: number,
  targetHeight: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }
      const sourceX = crop.left;
      const sourceY = crop.top;
      const sourceWidth = crop.right - crop.left;
      const sourceHeight = crop.bottom - crop.top;
      ctx.drawImage(
        img,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        targetWidth,
        targetHeight,
      );
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas to blob failed"));
      }, "image/png");
    };
    img.onerror = () => reject(new Error("Failed to load image for cropping"));
    img.src = dataUrl;
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
}

export function copyRequest<T extends Partial<GenerationSettings>>(
  request: T,
): T {
  return JSON.parse(JSON.stringify(request));
}
