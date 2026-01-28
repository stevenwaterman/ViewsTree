import { sorted, stateful, type Stateful } from "../../utils";
import { type Writable, writable } from "svelte/store";
import {
  getChildLeafCountStore,
  getNodeIsTypes,
  loadNode,
  sortChildren,
  type BaseNode,
  type SecondaryBranchNode,
  type Serialised,
} from "./nodes";
import type { RootNode } from "./rootNodes";

export type UploadRequest = {
  image: string;
  crop: { top: number; right: number; bottom: number; left: number };
  width: number;
  height: number;
};

export type UploadResult = {
  id: string;
  width: number;
  height: number;
  comfyImage: {
    filename: string;
    subfolder: string;
    type: string;
  };
};

export type UploadNode = UploadResult & BaseNode<"Upload">;

export function createUploadNode(
  result: UploadResult,
  parent: RootNode
): UploadNode {
  const children: Stateful<Writable<SecondaryBranchNode[]>> = stateful(
    sorted(writable([]), sortChildren)
  );
  const { childLeafCount, leafCount } = getChildLeafCountStore(children);

  const node: UploadNode = {
    ...result,
    ...getNodeIsTypes("Upload"),
    parent,
    children,
    pendingRequests: stateful(writable({ requests: [], running: false })),
    childLeafCount,
    leafCount,
    lastSelectedId: stateful(writable(undefined)),
    serialise: () => ({
      ...result,
      id: node.id,
      type: node.type,
      children: children.state.map((child) => child.serialise()),
    }),
  };

  return node;
}

export function loadUploadNode(
  data: Serialised<"Upload">,
  parent: RootNode
): UploadNode {
  const node = createUploadNode(data as any, parent);
  const children = data.children.map((child) => loadNode(child, node));
  node.children.set(children);
  parent.children.update((children) => [...children, node]);
  return node;
}