import { sorted, stateful, type Stateful } from "../../utils";
import { type Writable, writable } from "svelte/store";
import {
  getChildLeafCountStore,
  getNodeIsTypes,
  loadNode,
  sortChildren,
  type BaseNode,
  type BranchNode,
  type SecondaryBranchNode,
  type Serialised,
} from "./nodes";

export type MaskRequest = {
  image: string;
  width: number;
  height: number;
};

export type MaskResult = {
  id: string;
  width: number;
  height: number;
  comfyImage: {
    filename: string;
    subfolder: string;
    type: string;
  };
};

export type MaskNode = MaskResult & BaseNode<"Mask">;

export function createMaskNode(result: MaskResult, parent: BranchNode): MaskNode {
  const children: Stateful<Writable<SecondaryBranchNode[]>> = stateful(
    sorted(writable([]), sortChildren)
  );
  const { childLeafCount, leafCount } = getChildLeafCountStore(children);

  const node: MaskNode = {
    ...result,
    ...getNodeIsTypes("Mask"),
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

export function loadMaskNode(
  data: Serialised<"Mask">,
  parent: BranchNode
): MaskNode {
  const node = createMaskNode(data as any, parent);
  const children = data.children.map((child) => loadNode(child, node));
  node.children.set(children);
  parent.children.update((children) => [...children, node]);
  return node;
}