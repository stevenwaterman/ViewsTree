import { stateful, type Stateful } from "../../utils";
import { type Writable, type Readable, writable } from "svelte/store";
import {
  getChildLeafCountStore,
  getNodeIsTypes,
  type BranchNode,
  type NodeIsTypes,
  type SecondaryBranchNode,
} from "./nodes";

export type ImgImgRequest = {
  prompt: string;
  steps: number;
  scale: number;
  eta: number;
  strength: number;
  seed?: number;
  colorCorrection: boolean;
};

export type ImgImgResult = {
  id: string;
  prompt: string;
  steps: number;
  scale: number;
  eta: number;
  seed: {
    random: boolean;
    actual: number;
  };
  strength: number;
  colorCorrection: boolean;
};

export type ImgImgNode = ImgImgResult &
  NodeIsTypes<"ImgImg"> & {
    parent: BranchNode;
    children: Stateful<Writable<SecondaryBranchNode[]>>;
    pendingChildren: Writable<number>;
    childLeafCount: Readable<number[]>;
    leafCount: Readable<number>;
    lastSelectedId: Stateful<Writable<string | undefined>>;
  };

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
    pendingChildren: writable(0),
    childLeafCount,
    leafCount,
    lastSelectedId: stateful(writable(undefined)),
  };

  return node;
}

export async function fetchImgImgNode(
  saveName: string,
  parent: BranchNode,
  request: ImgImgRequest
): Promise<ImgImgNode> {
  return await fetch(`http://localhost:5001/${saveName}/branch/${parent.id}`, {
    method: "POST",
    body: JSON.stringify({
      ...request,
      init_run_id: parent.id,
      color_correction_id: getColorCorrectionId(parent, request),
    }),
  })
    .then((response) => {
      if (response.status === 429) throw "Server busy";
      else return response;
    })
    .then((response) => response.json())
    .then(
      (data) =>
        ({
          id: data["run_id"],
          prompt: data["prompt"],
          steps: data["steps"],
          scale: data["scale"],
          eta: data["eta"],
          seed: {
            random: data["seed"] === null,
            actual: data["actual_seed"],
          },
          strength: data["strength"],
          colorCorrection: request.colorCorrection,
        } as ImgImgResult)
    )
    .then((result) => createImgImgNode(result, parent));
}

function getColorCorrectionId(
  parent: BranchNode,
  request: ImgImgRequest
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
