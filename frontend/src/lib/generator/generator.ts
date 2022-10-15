import { fetchImgImgNode } from "../state/nodeTypes/imgImgNodes";
import type { AnyNode, BranchNode } from "../state/nodeTypes/nodes";
import { fetchTxtImgNode } from "../state/nodeTypes/txtImgNodes";
import type { GenerationSettings } from "../state/settings";

let endOfQueue: Promise<any> = Promise.resolve();

export async function queueGeneration(
  saveName: string,
  request: GenerationSettings,
  parent: AnyNode
): Promise<void> {
  request = { ...request };

  parent.pendingChildren.update((count) => count + 1);

  if (parent.isBranch) {
    endOfQueue = endOfQueue.finally(async () => {
      const node = await fetchImgImgNode(saveName, parent, request);
      parent.children.update((children) => [...children, node]);
    });
  } else {
    endOfQueue = endOfQueue.finally(async () => {
      const node = await fetchTxtImgNode(saveName, request);
      parent.children.update((children) => [...children, node]);
    });
  }

  endOfQueue = endOfQueue.finally(() =>
    parent.pendingChildren.update((count) => count - 1)
  );

  return endOfQueue;
}

export function imageUrl(saveName: string, node: BranchNode): string {
  return `http://localhost:5001/${saveName}/image/${node.id}`;
}

export function thumbnailUrl(saveName: string, node: BranchNode): string {
  return `http://localhost:5001/${saveName}/thumb/${node.id}`;
}
