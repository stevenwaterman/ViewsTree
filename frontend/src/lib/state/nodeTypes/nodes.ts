import {
  mapUnwrap,
  stateful,
  tassert,
  type Stateful,
  type TAssert,
  type ValueOf,
} from "../../utils";
import { derived, writable, type Readable, type Writable } from "svelte/store";
import { loadImgImgNode, type ImgImgNode } from "./imgImgNodes";
import { loadTxtImgNode, type TxtImgNode } from "./txtImgNodes";
import { loadUploadNode, type UploadNode } from "./uploadNode";
import type { GenerationRequest } from "src/lib/generator/generator";
import { loadRootNode, type RootNode } from "./rootNodes";
import { loadImgCycleNode, type ImgCycleNode } from "./imgCycleNodes";
import { loadMaskNode, type MaskNode } from "./maskNodes";
import { loadInpaintNode, type InpaintNode } from "./inpaintNodes";
import { modelsStore } from "../models";

export type NodeTypeStrings =
  | "Root"
  | "TxtImg"
  | "Upload"
  | "ImgImg"
  | "ImgCycle"
  | "Mask"
  | "Inpaint";

const isBranch = tassert<Record<NodeTypeStrings, boolean>>()({
  Root: false,
  TxtImg: true,
  Upload: true,
  ImgImg: true,
  ImgCycle: true,
  Mask: true,
  Inpaint: true,
} as const);

const isPrimaryBranch = tassert<Record<NodeTypeStrings, boolean>>()({
  Root: false,
  TxtImg: true,
  Upload: true,
  ImgImg: false,
  ImgCycle: false,
  Mask: false,
  Inpaint: false,
} as const);

const isSecondaryBranch = tassert<Record<NodeTypeStrings, boolean>>()({
  Root: false,
  TxtImg: false,
  Upload: false,
  ImgImg: true,
  ImgCycle: true,
  Mask: true,
  Inpaint: true,
} as const);

export type NodeTypes = TAssert<
  Record<NodeTypeStrings, AnyNode>,
  {
    Root: RootNode;
    TxtImg: TxtImgNode;
    Upload: UploadNode;
    ImgImg: ImgImgNode;
    ImgCycle: ImgCycleNode;
    Mask: MaskNode;
    Inpaint: InpaintNode;
  }
>;

type NodeCategories = TAssert<
  Record<NodeTypeStrings, "Root" | "Primary" | "Secondary">,
  {
    Root: "Root";
    TxtImg: "Primary";
    Upload: "Primary";
    ImgImg: "Secondary";
    ImgCycle: "Secondary";
    Mask: "Secondary";
    Inpaint: "Secondary";
  }
>;

type NodeParent = TAssert<
  Record<ValueOf<NodeCategories>, undefined | RootNode | BranchNode>,
  {
    Root: undefined;
    Primary: RootNode;
    Secondary: BranchNode;
  }
>;

type NodeChild = TAssert<
  Record<ValueOf<NodeCategories>, PrimaryBranchNode | SecondaryBranchNode>,
  {
    Root: PrimaryBranchNode;
    Primary: SecondaryBranchNode;
    Secondary: SecondaryBranchNode;
  }
>;

type NodeId = TAssert<
  Record<ValueOf<NodeCategories>, string | undefined>,
  {
    Root: undefined;
    Primary: string;
    Secondary: string;
  }
>;

type NodeIsTypes<T extends NodeTypeStrings> = {
  type: T;

  isBranch: typeof isBranch[T];
  isPrimaryBranch: typeof isPrimaryBranch[T];
  isSecondaryBranch: typeof isSecondaryBranch[T];
};

export type BaseNode<T extends NodeTypeStrings> = NodeIsTypes<T> & {
  id: NodeId[NodeCategories[T]];
  parent: NodeParent[NodeCategories[T]];
  children: Stateful<Writable<Array<NodeChild[NodeCategories[T]]>>>;
  pendingRequests: Stateful<
    Writable<{ requests: GenerationRequest[]; running: boolean }>
  >;
  childLeafCount: Readable<number[]>;
  leafCount: Readable<number>;
  lastSelectedId: Stateful<Writable<string | undefined>>;
  serialise: () => Serialised<T>;
};

export function getNodeIsTypes<T extends NodeTypeStrings>(
  type: T
): NodeIsTypes<T> {
  return {
    type,
    isBranch: isBranch[type],
    isPrimaryBranch: isPrimaryBranch[type],
    isSecondaryBranch: isSecondaryBranch[type],
  };
}

export type PrimaryBranchNode = TxtImgNode | UploadNode;
export type SecondaryBranchNode =
  | ImgImgNode
  | ImgCycleNode
  | MaskNode
  | InpaintNode;
export type BranchNode = PrimaryBranchNode | SecondaryBranchNode;
export type AnyNode = RootNode | BranchNode;

export function getChildLeafCountStore(childrenStore: Readable<BranchNode[]>): {
  childLeafCount: Readable<number[]>;
  leafCount: Readable<number>;
} {
  const childLeafCount: Readable<number[]> = mapUnwrap<BranchNode, number>(
    childrenStore,
    (child) => child.leafCount
  );

  const leafCount: Readable<number> = derived(childLeafCount, (children) => {
    if (children.length === 0) return 1;
    else return children.reduce((a, b) => a + b, 0);
  });

  return { childLeafCount, leafCount };
}
type NodeType<N extends AnyNode> = N["type"];
type ChildOf<T extends NodeTypeStrings> = NodeChild[NodeCategories[T]];
export type ParentOf<T extends NodeTypeStrings> = NodeParent[NodeCategories[T]];
type Result<T extends NodeTypeStrings> = Omit<
  NodeTypes[T],
  keyof BaseNode<T> | "modelsHash"
>;
type Dehydrated<T extends NodeTypeStrings> = Result<T> &
  Pick<BaseNode<T>, "id" | "type">;
export type Serialised<T extends NodeTypeStrings> = Dehydrated<T> & {
  children: Serialised<NodeType<ChildOf<T>>>[];
};

export function loadNode<T extends NodeTypeStrings>(
  data: Serialised<T>,
  parent: ParentOf<T>
): NodeTypes[T] {
  // I give up.
  const serial = data as Serialised<any>;
  const type: NodeTypeStrings = data.type;

  if (type === "Root")
    return loadRootNode(serial as Serialised<"Root">) as NodeTypes[T];

  if (type === "TxtImg")
    return loadTxtImgNode(
      serial as Serialised<"TxtImg">,
      parent as ParentOf<"TxtImg">
    ) as NodeTypes[T];

  if (type === "Upload")
    return loadUploadNode(
      serial as Serialised<"Upload">,
      parent as ParentOf<"Upload">
    ) as NodeTypes[T];

  if (type === "ImgImg")
    return loadImgImgNode(
      serial as Serialised<"ImgImg">,
      parent as ParentOf<"ImgImg">
    ) as NodeTypes[T];

  if (type === "ImgCycle")
    return loadImgCycleNode(
      serial as Serialised<"ImgCycle">,
      parent as ParentOf<"ImgCycle">
    ) as NodeTypes[T];

  if (type === "Mask")
    return loadMaskNode(
      serial as Serialised<"Mask">,
      parent as ParentOf<"Mask">
    ) as NodeTypes[T];

  if (type === "Inpaint")
    return loadInpaintNode(
      serial as Serialised<"Inpaint">,
      parent as ParentOf<"Inpaint">
    ) as NodeTypes[T];

  throw "Forgot a case";
}

export function modelsHash(models: Record<string, number>): string {
  const modelEntries = Object.entries(models).filter(
    ([_, weight]) => weight !== 0
  );
  if (modelEntries.length === 0) return "";
  modelEntries.sort((a, b) => {
    if (a[0] > b[0]) return 1;
    if (a[0] < b[0]) return -1;
    if (a[1] > b[1]) return 1;
    if (a[1] < b[1]) return -1;
    return 0;
  });

  const totalWeight = modelEntries.reduce(
    (acc, [_, weight]) => acc + weight,
    0
  );
  const fractional = modelEntries.map(
    ([model, weight]) => `${model}_${(weight / totalWeight).toFixed(5)}`
  );
  const original = modelEntries.map(([_, weight]) => `${weight}`);
  fractional.push(...original);
  return fractional.join(",");
}

export function sortChildren(a: AnyNode, b: AnyNode): number {
  // Put masks at the end
  if (a.type === "Mask" && b.type !== "Mask") return 1;
  if (a.type !== "Mask" && b.type === "Mask") return -1;

  // Put uploads at the end
  if (a.type === "Upload" && b.type !== "Upload") return 1;
  if (a.type !== "Upload" && b.type === "Upload") return -1;

  // Put set-seed images at the end
  if ("seed" in a && "seed" in b) {
    if (a.seed.random && !b.seed.random) return -1;
    if (!a.seed.random && b.seed.random) return 1;
  }

  // Put same-set-seed together
  if ("seed" in a && "seed" in b) {
    if (!a.seed.random && !b.seed.random) {
      if (a.seed.actual > b.seed.actual) return 1;
      if (a.seed.actual < b.seed.actual) return -1;
    }
  }

  // Put same-prompt together
  if ("prompt" in a && "prompt" in b) {
    if (a.prompt > b.prompt) return 1;
    if (a.prompt < b.prompt) return -1;
  }

  // Put same-type together
  if (a.type > b.type) return 1;
  if (a.type < b.type) return -1;

  // Sort by models
  if ("modelsHash" in a && "modelsHash" in b) {
    if (a.modelsHash > b.modelsHash) return 1;
    if (a.modelsHash < b.modelsHash) return -1;
  }

  // Sort by strength
  if ("strength" in a && "strength" in b) {
    if (a.strength > b.strength) return 1;
    if (a.strength < b.strength) return -1;
  }

  // Sort by scale
  if ("scale" in a && "scale" in b) {
    if (a.scale > b.scale) return 1;
    if (a.scale < b.scale) return -1;
  }

  // Sort by steps
  if ("steps" in a && "steps" in b) {
    if (a.steps > b.steps) return 1;
    if (a.steps < b.steps) return -1;
  }

  return 0;
}
