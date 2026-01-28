import { sorted, stateful, type Stateful } from "../../utils";
import { type Writable, writable } from "svelte/store";
import {
  getChildLeafCountStore,
  getNodeIsTypes,
  loadNode,
  modelsHash,
  sortChildren,
  type BaseNode,
  type ComfySettings,
  type SecondaryBranchNode,
  type Serialised,
} from "./nodes";
import type { RootNode } from "./rootNodes";

export type TxtImgRequest = ComfySettings & {
  prompt: string;
  negativePrompt: string;
  width: number;
  height: number;
  steps: number;
  scale: number;
  seed?: number;
};

export type TxtImgResult = ComfySettings & {
  id: string;
  prompt: string;
  negativePrompt: string;
  width: number;
  height: number;
  steps: number;
  scale: number;
  seed: {
    random: boolean;
    actual: number;
  };
  comfyImage: {
    filename: string;
    subfolder: string;
    type: string;
  };
};

export type TxtImgNode = TxtImgResult &
  BaseNode<"TxtImg"> & { modelsHash: string };

export function createTxtImgNode(
  result: TxtImgResult,
  parent: RootNode
): TxtImgNode {
  const children: Stateful<Writable<SecondaryBranchNode[]>> = stateful(
    sorted(writable([]), sortChildren)
  );
  const { childLeafCount, leafCount } = getChildLeafCountStore(children);

  const node: TxtImgNode = {
    ...result,
    ...getNodeIsTypes("TxtImg"),
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

export function loadTxtImgNode(
  data: Serialised<"TxtImg">,
  parent: RootNode
): TxtImgNode {
  const node = createTxtImgNode(data as any, parent);
  const children = data.children.map((child) => loadNode(child, node));
  node.children.set(children);
  parent.children.update((children) => [...children, node]);
  return node;
}