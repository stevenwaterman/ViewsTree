import { writable, type Readable, type Writable } from "svelte/store";
import { fetchImgImgNode } from "../state/nodeTypes/imgImgNodes";
import type { AnyNode, BranchNode } from "../state/nodeTypes/nodes";
import { fetchTxtImgNode } from "../state/nodeTypes/txtImgNodes";
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

  endOfQueue = endOfQueue.finally(async () => {
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
  });

  return endOfQueue;
}

export async function queueGeneration(
  saveName: string,
  request: GenerationSettings,
  parent: AnyNode
): Promise<void> {
  request = { ...request };

  if (parent.type === "Root")
    return addToQueue(parent.pendingRequests, () =>
      fetchTxtImgNode(saveName, request)
    );

  if (parent.isBranch)
    return addToQueue(parent.pendingRequests, () =>
      fetchImgImgNode(saveName, request, parent)
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
