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
  type SecondaryBranchNode,
  type Serialised,
} from "./nodes";

export type InpaintRequest = {
  models: Record<string, number>;
  prompt: string;
  negativePrompt: string;
  steps: number;
  scale: number;
  strength: number;
  seed?: number;
  colorCorrection: boolean;
};

export type InpaintResult = {
  id: string;
  models: Record<string, number>;
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

export type InpaintNode = InpaintResult & BaseNode<"Inpaint"> & { modelsHash: string };

function createInpaintNode(
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

export async function fetchInpaintNode(
  saveName: string,
  request: InpaintRequest,
  parent: BranchNode
): Promise<InpaintNode> {
  return await fetch(
    `http://localhost:5001/${saveName}/inpaint/${parent.parent.id}/${parent.id}`,
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
      const result: InpaintResult = {
        id: data["run_id"],
        models: data["models"],
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
      return createInpaintNode(result, parent);
    });
}

export function loadInpaintNode(
  data: Serialised<"Inpaint">,
  parent: BranchNode
): InpaintNode {
  const node = createInpaintNode(data, parent);
  const children = data.children.map((child) => loadNode(child, node));
  node.children.set(children);
  parent.children.update((children) => [...children, node]);
  return node;
}

function getColorCorrectionId(
  parent: BranchNode,
  request: InpaintRequest
): string | undefined {
  // Only do color correction on branches that have it enabled
  if (!request.colorCorrection) return undefined;

  // Get the first ancestor with color correction disabled
  let pointer: BranchNode = parent;
  while (
    pointer.isSecondaryBranch &&
    !(pointer.type === "ImgImg" && !pointer.colorCorrection)
  ) {
    pointer = pointer.parent;
  }

  return pointer.id;
}
