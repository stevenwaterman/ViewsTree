import { sorted, stateful, type Stateful } from "../../utils";
import { type Writable, writable, derived } from "svelte/store";
import {
  getChildLeafCountStore,
  getNodeIsTypes,
  loadNode,
  modelsHash,
  sortChildren,
  type BaseNode,
  type BranchNode,
  type SecondaryBranchNode,
  type Serialised,
} from "./nodes";

export type ImgCycleRequest = {
  models: Record<string, number>;
  sourcePrompt: string;
  prompt: string;
  negativePrompt: string;
  steps: number;
  scale: number;
  strength: number;
  seed?: number;
  colorCorrection: boolean;
};

export type ImgCycleResult = {
  id: string;
  models: Record<string, number>;
  sourcePrompt: string;
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
};

export type ImgCycleNode = ImgCycleResult &
  BaseNode<"ImgCycle"> & { modelsHash: string };

function createImgCycleNode(
  result: ImgCycleResult,
  parent: BranchNode
): ImgCycleNode {
  const children: Stateful<Writable<SecondaryBranchNode[]>> = stateful(
    sorted(writable([]), sortChildren)
  );
  const { childLeafCount, leafCount } = getChildLeafCountStore(children);

  const node: ImgCycleNode = {
    ...result,
    ...getNodeIsTypes("ImgCycle"),
    parent,
    children,
    pendingRequests: stateful(writable({ requests: [], running: false })),
    childLeafCount,
    leafCount,
    lastSelectedId: stateful(writable(undefined)),
    modelsHash: modelsHash(result.models),
    serialise: () => ({
      ...result,
      id: node.id,
      type: node.type,
      children: children.state.map((child) => child.serialise()),
    }),
  };

  return node;
}

export async function fetchImgCycleNode(
  saveName: string,
  request: ImgCycleRequest,
  parent: BranchNode
): Promise<ImgCycleNode> {
  return await fetch(
    `http://localhost:5001/${saveName}/imgcycle/${parent.id}`,
    {
      method: "POST",
      body: JSON.stringify({
        ...request,
        colorCorrectionId: getColorCorrectionId(parent, request),
      }),
    }
  )
    .then((response) => {
      if (response.status === 429) throw "Server busy";
      else return response;
    })
    .then((response) => response.json())
    .then((data) => {
      const result: ImgCycleResult = {
        id: data["run_id"],
        models: data["models"],
        sourcePrompt: data["source_prompt"],
        prompt: data["prompt"],
        negativePrompt: data["negative_prompt"],
        steps: data["steps"],
        scale: data["scale"],
        seed: {
          random: data["seed"] === null,
          actual: data["actual_seed"],
        },
        strength: data["strength"],
        colorCorrection: request.colorCorrection,
      };
      return createImgCycleNode(result, parent);
    });
}

export function loadImgCycleNode(
  data: Serialised<"ImgCycle">,
  parent: BranchNode
): ImgCycleNode {
  const node = createImgCycleNode(data, parent);
  const children = data.children.map((child) => loadNode(child, node));
  node.children.set(children);
  parent.children.update((children) => [...children, node]);
  return node;
}

function getColorCorrectionId(
  parent: BranchNode,
  request: ImgCycleRequest
): string | undefined {
  // Only do color correction on branches that have it enabled
  if (!request.colorCorrection) return undefined;

  // Get the first ancestor with color correction disabled
  let pointer: BranchNode = parent;
  while (pointer.type === "ImgImg" && pointer.colorCorrection) {
    pointer = pointer.parent;
  }

  return pointer.id;
}
