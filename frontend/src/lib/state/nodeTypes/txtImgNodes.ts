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

export type TxtImgRequest = {
  models: Record<string, number>;
  prompt: string;
  negativePrompt: string;
  width: number;
  height: number;
  steps: number;
  scale: number;
  seed?: number;
};

export type TxtImgResult = {
  id: string;
  models: Record<string, number>;
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
};

export type TxtImgNode = TxtImgResult & BaseNode<"TxtImg">;

function createTxtImgNode(result: TxtImgResult, parent: RootNode): TxtImgNode {
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
    serialise: () => ({
      ...result,
      id: node.id,
      type: node.type,
      children: children.state.map((child) => child.serialise()),
    }),
  };

  return node;
}

export async function fetchTxtImgNode(
  saveName: string,
  request: TxtImgRequest,
  parent: RootNode
): Promise<TxtImgNode> {
  return await fetch(`http://localhost:5001/${saveName}/txtimg`, {
    method: "POST",
    body: JSON.stringify(request),
  })
    .then((response) => {
      if (response.status === 429) throw "Server busy";
      else return response;
    })
    .then((response) => response.json())
    .then((data) => {
      const result: TxtImgResult = {
        id: data["run_id"],
        models: data["models"],
        prompt: data["prompt"],
        negativePrompt: data["negative_prompt"],
        width: data["width"],
        height: data["height"],
        steps: data["steps"],
        scale: data["scale"],
        seed: {
          random: data["seed"] === null,
          actual: data["actual_seed"],
        },
      };
      return createTxtImgNode(result, parent);
    });
}

export function loadTxtImgNode(
  data: Serialised<"TxtImg">,
  parent: RootNode
): TxtImgNode {
  const node = createTxtImgNode(data, parent);
  const children = data.children.map((child) => loadNode(child, node));
  node.children.set(children);
  parent.children.update((children) => [...children, node]);
  return node;
}
