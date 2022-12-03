import { stateful, type Stateful } from "../../utils";
import { type Writable, writable } from "svelte/store";
import {
  getChildLeafCountStore,
  getNodeIsTypes,
  loadNode,
  type BaseNode,
  type BranchNode,
  type SecondaryBranchNode,
  type Serialised,
} from "./nodes";

export type ImgImgRequest = {
  models: Record<string, number>;
  prompt: string;
  negativePrompt: string;
  steps: number;
  scale: number;
  strength: number;
  seed?: number;
  colorCorrection: boolean;
};

export type ImgImgResult = {
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

export type ImgImgNode = ImgImgResult & BaseNode<"ImgImg">;

function createImgImgNode(
  result: ImgImgResult,
  parent: BranchNode
): ImgImgNode {
  const children: Stateful<Writable<SecondaryBranchNode[]>> = stateful(
    writable([])
  );
  const { childLeafCount, leafCount } = getChildLeafCountStore(children);

  const node: ImgImgNode = {
    ...result,
    ...getNodeIsTypes("ImgImg"),
    parent,
    children,
    pendingRequests: stateful(writable([])),
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

export async function fetchImgImgNode(
  saveName: string,
  request: ImgImgRequest,
  parent: BranchNode
): Promise<ImgImgNode> {
  return await fetch(`http://localhost:5001/${saveName}/imgimg/${parent.id}`, {
    method: "POST",
    body: JSON.stringify({
      ...request,
      colorCorrectionId: getColorCorrectionId(parent, request),
    }),
  })
    .then((response) => {
      if (response.status === 429) throw "Server busy";
      else return response;
    })
    .then((response) => response.json())
    .then((data) => {
      const result: ImgImgResult = {
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
      return createImgImgNode(result, parent);
    });
}

export function loadImgImgNode(
  data: Serialised<"ImgImg">,
  parent: BranchNode
): ImgImgNode {
  const node = createImgImgNode(data, parent);
  const children = data.children.map((child) => loadNode(child, node));
  node.children.set(children);
  parent.children.update((children) => [...children, node]);
  return node;
}

function getColorCorrectionId(
  parent: BranchNode,
  request: ImgImgRequest
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
