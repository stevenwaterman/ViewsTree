import type { Writable } from "svelte/store";
import { saveStore } from "../persistence/saves";
import {
  createImgImgNode,
  type ImgImgRequest,
} from "../state/nodeTypes/imgImgNodes";
import {
  modelsHash,
  type AnyNode,
  type BranchNode,
} from "../state/nodeTypes/nodes";
import type { RootNode } from "../state/nodeTypes/rootNodes";
import {
  createTxtImgNode,
  type TxtImgRequest,
} from "../state/nodeTypes/txtImgNodes";
import { type GenerationSettings, randomSeed } from "../state/settings";
import { getComfyClient } from "./comfyClient";

export type GenerationRequest = {
  modelsHash: string;
  fire: () => Promise<void>;
  cancel: () => void;
};

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
  request: TxtImgRequest,
  parent: RootNode
) {
  const clonedRequest = JSON.parse(JSON.stringify(request));
  const hash = modelsHash(clonedRequest);
  
  return runGeneration(parent.pendingRequests, hash, async (abortController) => {
    const client = getComfyClient();
    const seed = clonedRequest.seed ?? randomSeed();

    const workflow = {
      "3": {
        inputs: {
          seed: seed,
          steps: clonedRequest.steps,
          cfg: clonedRequest.scale,
          sampler_name: clonedRequest.sampler_name,
          scheduler: clonedRequest.scheduler,
          denoise: 1,
          model: ["10", 0],
          positive: ["6", 0],
          negative: ["7", 0],
          latent_image: ["5", 0],
        },
        class_type: "KSampler",
      },
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
      "6": {
        inputs: {
          text: clonedRequest.prompt,
          clip: ["11", 0],
        },
        class_type: "CLIPTextEncode",
      },
      "7": {
        inputs: {
          text: clonedRequest.negativePrompt,
          clip: ["11", 0],
        },
        class_type: "CLIPTextEncode",
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
  request: ImgImgRequest,
  parent: BranchNode
) {
  const clonedRequest = JSON.parse(JSON.stringify(request));
  const hash = modelsHash(clonedRequest);
  
  return runGeneration(parent.pendingRequests, hash, async (abortController) => {
    const client = getComfyClient();
    const seed = clonedRequest.seed ?? randomSeed();

    if (!parent.comfyImage) {
        throw new Error("Parent node has no image info for Img2Img");
    }

    let inputFilename = parent.comfyImage.filename;
    if (parent.comfyImage.type !== 'input') {
        const imageBlob = await client.getImage(parent.comfyImage);
        const uploadRes = await client.uploadImage(imageBlob, parent.comfyImage.filename);
        if (uploadRes) {
            inputFilename = uploadRes.info.filename;
        }
    }

    const workflow = {
      "3": {
        inputs: {
          seed: seed,
          steps: clonedRequest.steps,
          cfg: clonedRequest.scale,
          sampler_name: clonedRequest.sampler_name,
          scheduler: clonedRequest.scheduler,
          denoise: clonedRequest.strength,
          model: ["10", 0],
          positive: ["6", 0],
          negative: ["7", 0],
          latent_image: ["14", 0],
        },
        class_type: "KSampler",
      },
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
      "13": {
        inputs: {
          image: inputFilename,
          upload: "image"
        },
        class_type: "LoadImage"
      },
      "14": {
        inputs: {
          pixels: ["13", 0],
          vae: ["12", 0]
        },
        class_type: "VAEEncode"
      },
      "6": {
        inputs: {
          text: clonedRequest.prompt,
          clip: ["11", 0],
        },
        class_type: "CLIPTextEncode",
      },
      "7": {
        inputs: {
          text: clonedRequest.negativePrompt,
          clip: ["11", 0],
        },
        class_type: "CLIPTextEncode",
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

/**
 * Uses WebSockets to wait for a specific node to finish execution.
 * Fallback to history if WebSocket misses the event (e.g. cached).
 */
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

    // If it's already cached, we might get an 'execution_cached' event
    const onExecutionCached = (ev: any) => {
        if (ev.detail.prompt_id === promptId && ev.detail.nodes.includes(nodeId)) {
            // If cached, 'executed' won't fire for this node, so we check history
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

    // Safety timeout/polling fallback in case WebSocket fails or misses
    const timeout = setTimeout(async () => {
        const history = await client.getHistory(promptId);
        if (history && history.outputs[nodeId]) {
            cleanup();
            resolve(history.outputs[nodeId]);
        }
    }, 30000); // 30s safety net
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

export function queueInpaint(
  _saveName: string,
  _request: any,
  _parent: BranchNode
) {
  console.warn("queueInpaint not yet implemented for ComfyUI");
  return Promise.reject("Not implemented");
}

export async function sendUpload(
  _saveName: string,
  _request: any,
  _rootNode: RootNode
): Promise<void> {
  console.warn("sendUpload not yet implemented for ComfyUI");
}

export async function sendMask(
  _saveName: string,
  _request: any,
  _parent: BranchNode
): Promise<void> {
  console.warn("sendMask not yet implemented for ComfyUI");
}