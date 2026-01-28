import type { Writable } from "svelte/store";
import { saveStore } from "../persistence/saves";
import type { ImgImgRequest } from "../state/nodeTypes/imgImgNodes";
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

let running: boolean = false;
let queue: GenerationRequest[] = [];

function fireRequest() {
  if (running) return;
  if (queue.length === 0) return;
  queue[0].fire().finally(() => {
    running = false;
    fireRequest();
  });
}

function addToQueue<T extends BranchNode>(
  pendingRequests: Writable<{
    requests: GenerationRequest[];
    running: boolean;
  }>,
  modelsHashValue: string,
  reqFn: () => Promise<T>
): Promise<T> {
  return new Promise<T>((resolve) => {
    let hasStarted = false;
    let cancelled = false;
    const cancel = () => {
      if (hasStarted) return;
      if (cancelled) return;
      cancelled = true;
      queue = queue.filter((req) => req !== generationRequest);
      pendingRequests.update(({ requests, running }) => ({
        requests: requests.filter((req) => req !== generationRequest),
        running,
      }));
    };

    const fire = async () => {
      running = true;
      hasStarted = true;

      if (!cancelled) {
        pendingRequests.update(({ requests }) => ({
          requests,
          running: true,
        }));

        try {
          const node = await reqFn();
          (node.parent.children as Writable<any[]>).update((children) => [...children, node]);
          queue = queue.filter((req) => req !== generationRequest);
          saveStore.save();

          pendingRequests.update(({ requests }) => ({
            requests: requests.filter((req) => req !== generationRequest),
            running: false,
          }));
          resolve(node);
        } catch (e) {
          console.error("Generation failed", e);
          pendingRequests.update(({ requests }) => ({
            requests: requests.filter((req) => req !== generationRequest),
            running: false,
          }));
          running = false;
          fireRequest();
        }
      }
    };

    const generationRequest: GenerationRequest = {
      modelsHash: modelsHashValue,
      fire,
      cancel,
    };
    pendingRequests.update(({ requests, running }) => ({
      requests: [...requests, generationRequest],
      running,
    }));
    queue.push(generationRequest);
    fireRequest();
  });
}

export async function queueTxtImg(
  _saveName: string,
  request: TxtImgRequest,
  parent: RootNode
) {
  const hash = modelsHash(request);
  return addToQueue(parent.pendingRequests, hash, async () => {
    const client = getComfyClient();
    const seed = request.seed ?? randomSeed();

    const workflow = {
      "3": {
        inputs: {
          seed: seed,
          steps: request.steps,
          cfg: request.scale,
          sampler_name: request.sampler_name,
          scheduler: request.scheduler,
          denoise: 1,
          model: ["4", 0],
          positive: ["6", 0],
          negative: ["7", 0],
          latent_image: ["5", 0],
        },
        class_type: "KSampler",
      },
      "4": {
        inputs: {
          ckpt_name: request.checkpoint,
        },
        class_type: "CheckpointLoaderSimple",
      },
      "5": {
        inputs: {
          width: request.width,
          height: request.height,
          batch_size: 1,
        },
        class_type: "EmptyLatentImage",
      },
      "6": {
        inputs: {
          text: request.prompt,
          clip: ["4", 1],
        },
        class_type: "CLIPTextEncode",
      },
      "7": {
        inputs: {
          text: request.negativePrompt,
          clip: ["4", 1],
        },
        class_type: "CLIPTextEncode",
      },
      "8": {
        inputs: {
          samples: ["3", 0],
          vae: ["4", 2],
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
    const history = await pollHistory(promptRes.prompt_id);
    const output = history.outputs["9"];
    const imageInfo = output.images[0];

    return createTxtImgNode(
      {
        ...request,
        id: promptRes.prompt_id,
        seed: {
          random: request.seed === undefined,
          actual: seed,
        },
        comfyImage: imageInfo,
      },
      parent
    );
  });
}

async function pollHistory(promptId: string): Promise<any> {
  const client = getComfyClient();
  while (true) {
    const history = await client.getHistory(promptId);
    if (history) {
      return history;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
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
  return { ...request };
}

export function queueImgImg(
  _saveName: string,
  _request: ImgImgRequest,
  _parent: BranchNode
) {
  console.warn("queueImgImg not yet implemented for ComfyUI");
  return Promise.reject("Not implemented");
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
