import { sorted, stateful, type Stateful } from "../../utils";
import { type Writable, writable } from "svelte/store";
import {
  getChildLeafCountStore,
  getNodeIsTypes,
  loadNode,
  modelsHash,
  sortChildren,
  type BaseNode,
  type BranchNode,
  type ComfySettings,
  type SecondaryBranchNode,
  type Serialised,
} from "./nodes";

export type InpaintRequest = ComfySettings & {
  prompt: string;
  negativePrompt: string;
  steps: number;
  scale: number;
  strength: number;
  seed?: number;
  colorCorrection: boolean;
};

export type InpaintResult = ComfySettings & {
  id: string;
  prompt: string;
  negativePrompt: string;
  steps: number;
  scale: number;
  seed: {
    random: boolean;
    actual: number;
  };
  strength: number;
  colorCorrection: boolean;
  comfyImage: {
    filename: string;
    subfolder: string;
    type: string;
  };
};

export type InpaintNode = InpaintResult &
  BaseNode<"Inpaint"> & { modelsHash: string };

export function createInpaintNode(
  result: InpaintResult,
  parent: BranchNode
): InpaintNode {
  const children: Stateful<Writable<SecondaryBranchNode[]>> = stateful(
    sorted(writable([]), sortChildren)
  );
  const { childLeafCount, leafCount } = getChildLeafCountStore(children);

  const node: InpaintNode = {
    ...result,
    ...getNodeIsTypes("Inpaint"),
    parent,
    children,
    pendingRequests: stateful(writable({ requests: [], running: false })),
    childLeafCount,
    leafCount,
    lastSelectedId: stateful(writable(undefined)),
    modelsHash: modelsHash(result),
    serialise: () => ({
      ...result,
      id: node.id,
      type: node.type,
      children: children.state.map((child) => child.serialise()),
    }),
  };

  return node;
}

export function loadInpaintNode(
  data: Serialised<"Inpaint">,
  parent: BranchNode
): InpaintNode {
  const node = createInpaintNode(data as any, parent);
  const children = data.children.map((child) => loadNode(child, node));
  node.children.set(children);
  parent.children.update((children) => [...children, node]);
  return node;
}