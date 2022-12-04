import type { Writable } from "svelte/store";
import { saveStore } from "../persistence/saves";
import {
  fetchImgCycleNode,
  type ImgCycleRequest,
} from "../state/nodeTypes/ImgCycleNodes";
import {
  fetchImgImgNode,
  type ImgImgRequest,
} from "../state/nodeTypes/imgImgNodes";
import {
  fetchInpaintNode,
  type InpaintRequest,
} from "../state/nodeTypes/inpaintNodes";
import { fetchMaskNode, type MaskRequest } from "../state/nodeTypes/maskNodes";
import {
  modelsHash,
  type AnyNode,
  type BranchNode,
} from "../state/nodeTypes/nodes";
import type { RootNode } from "../state/nodeTypes/rootNodes";
import {
  fetchTxtImgNode,
  type TxtImgRequest,
} from "../state/nodeTypes/txtImgNodes";
import {
  fetchUploadNode,
  type UploadRequest,
} from "../state/nodeTypes/uploadNode";
import type { GenerationSettings } from "../state/settings";

export type GenerationRequest = {
  modelsHash: string;
  fire: () => Promise<void>;
  cancel: () => void;
};

let running: boolean = false;
let loadedModelHash: string = modelsHash({ "stable-diffusion-v1-5": 1 });
let queue: GenerationRequest[] = [];

function fireRequest() {
  if (running) return;
  if (queue.length === 0) return;
  queue[0].fire();
}

function addToQueue<T extends BranchNode>(
  pendingRequests: Writable<{
    requests: GenerationRequest[];
    running: boolean;
  }>,
  models: Record<string, number>,
  reqFn: () => Promise<T>
) {
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

      const node = await reqFn();
      node.parent.children.update((children) => [...children, node]);
      queue = queue.filter((req) => req !== generationRequest);
      saveStore.save();

      pendingRequests.update(({ requests }) => ({
        requests: requests.filter((req) => req !== generationRequest),
        running: false,
      }));
    }

    running = false;
    fireRequest();
  };

  const modelsPairs = Object.entries(models).filter((entry) => entry[1] !== 0);
  modelsPairs.sort((a, b) => a[1] - b[1]);
  const totalWeight = modelsPairs.reduce((acc, elem) => acc + elem[1], 0);
  const modelsHash: string = modelsPairs
    .map(([model, weight]) => `${model}${weight / totalWeight}`)
    .join("");

  const generationRequest: GenerationRequest = { modelsHash, fire, cancel };
  pendingRequests.update(({ requests, running }) => ({
    requests: [...requests, generationRequest],
    running,
  }));
  queue.push(generationRequest);
  queue.sort((a, b) => {
    if (a.modelsHash === loadedModelHash && b.modelsHash !== loadedModelHash)
      return -1;
    if (a.modelsHash !== loadedModelHash && b.modelsHash === loadedModelHash)
      return 1;
    if (a.modelsHash > b.modelsHash) return 1;
    if (a.modelsHash < b.modelsHash) return -1;
    return 0;
  });
  fireRequest();
}

export function queueTxtImg(
  saveName: string,
  request: TxtImgRequest,
  parent: RootNode
) {
  request = copyRequest(request);
  addToQueue(parent.pendingRequests, request.models, () =>
    fetchTxtImgNode(saveName, request, parent)
  );
}

export function queueImgImg(
  saveName: string,
  request: ImgImgRequest,
  parent: BranchNode
) {
  request = copyRequest(request);
  addToQueue(parent.pendingRequests, request.models, () =>
    fetchImgImgNode(saveName, request, parent)
  );
}

export function queueImgCycle(
  saveName: string,
  request: ImgCycleRequest,
  parent: BranchNode
) {
  request = copyRequest(request);
  addToQueue(parent.pendingRequests, request.models, () =>
    fetchImgCycleNode(saveName, request, parent)
  );
}

export function queueInpaint(
  saveName: string,
  request: InpaintRequest,
  parent: BranchNode
) {
  request = copyRequest(request);
  addToQueue(parent.pendingRequests, request.models, () =>
    fetchInpaintNode(saveName, request, parent)
  );
}

export async function sendUpload(
  saveName: string,
  request: UploadRequest,
  rootNode: RootNode
): Promise<void> {
  return fetchUploadNode(saveName, request, rootNode).then((node) =>
    node.parent.children.update((children) => [...children, node])
  );
}

export async function sendMask(
  saveName: string,
  request: MaskRequest,
  parent: BranchNode
): Promise<void> {
  return fetchMaskNode(saveName, request, parent).then((node) =>
    node.parent.children.update((children) => [...children, node])
  );
}

export function imageUrl(saveName: string, node: BranchNode): string {
  return `http://localhost:5001/${saveName}/image/${node.id}`;
}

export function thumbnailUrl(saveName: string, node: BranchNode): string {
  return `http://localhost:5001/${saveName}/thumb/${node.id}`;
}

export function cancelRequest(node: AnyNode): void {
  const pendingRequests = node.pendingRequests.state;
  if (pendingRequests.requests.length === 0) return;

  const lastReq = pendingRequests.requests[pendingRequests.requests.length - 1];
  lastReq.cancel();
}

export function copyRequest<T extends Partial<GenerationSettings>>(
  request: T
): T {
  const copy = { ...request };
  if (copy.models) {
    copy.models = {};
    for (const key in request.models) {
      const value = request.models[key];
      if (value !== 0) copy.models[key] = value;
    }
  }
  return copy;
}
