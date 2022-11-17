import { writable, type Readable, type Writable } from "svelte/store";
import { saveStore } from "../persistence/saves";
import { fetchImgCycleNode } from "../state/nodeTypes/ImgCycleNodes";
import { fetchImgImgNode } from "../state/nodeTypes/imgImgNodes";
import type { AnyNode, BranchNode } from "../state/nodeTypes/nodes";
import type { RootNode } from "../state/nodeTypes/rootNodes";
import { fetchTxtImgNode } from "../state/nodeTypes/txtImgNodes";
import {
  fetchUploadNode,
  type UploadRequest,
} from "../state/nodeTypes/uploadNode";
import type { GenerationSettings } from "../state/settings";

export type GenerationRequest = {
  started: Readable<boolean>;
  cancel: () => void;
};

let endOfQueue: Promise<any> = Promise.resolve();

function addToQueue<T extends BranchNode>(
  pendingRequests: Writable<GenerationRequest[]>,
  reqFn: () => Promise<T>
): Promise<void> {
  const started = writable(false);

  let hasStarted = false;
  let cancelled = false;
  const cancel = () => {
    if (hasStarted) return;
    if (cancelled) return;
    cancelled = true;
    pendingRequests.update((reqs) =>
      reqs.filter((req) => req !== generationRequest)
    );
  };

  const generationRequest: GenerationRequest = {
    started,
    cancel,
  };

  pendingRequests.update((reqs) => [...reqs, generationRequest]);

  endOfQueue = endOfQueue
    .finally(async () => {
      if (cancelled) return;
      hasStarted = true;
      started.set(true);

      await reqFn()
        .then((node) =>
          node.parent.children.update((children) => [...children, node])
        )
        .finally(() =>
          pendingRequests.update((reqs) =>
            reqs.filter((req) => req !== generationRequest)
          )
        );
    })
    .finally(() => saveStore.save());

  return endOfQueue;
}

export async function queueTxtImg(
  saveName: string,
  request: GenerationSettings,
  parent: RootNode
): Promise<void> {
  request = copyRequest(request);
  return addToQueue(parent.pendingRequests, () =>
    fetchTxtImgNode(saveName, request, parent)
  );
}

export async function queueImgImg(
  saveName: string,
  request: GenerationSettings,
  parent: BranchNode
): Promise<void> {
  request = copyRequest(request);
  return addToQueue(parent.pendingRequests, () =>
    fetchImgImgNode(saveName, request, parent)
  );
}

export async function queueImgCycle(
  saveName: string,
  request: GenerationSettings,
  parent: BranchNode
): Promise<void> {
  request = copyRequest(request);
  return addToQueue(parent.pendingRequests, () =>
    fetchImgCycleNode(saveName, request, parent)
  );
}

export async function queueUpload(
  saveName: string,
  request: UploadRequest,
  rootNode: RootNode
): Promise<void> {
  request = JSON.parse(JSON.stringify(request));
  return addToQueue(rootNode.pendingRequests, () =>
    fetchUploadNode(saveName, request, rootNode)
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
  if (pendingRequests.length === 0) return;

  const lastReq = pendingRequests[pendingRequests.length - 1];
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
      if (value > 0) copy.models[key] = value;
    }
  }
  return copy;
}
