import { mapUnwrap, tassert, type Stateful, type TAssert, type ValueOf } from "../../utils";
import { derived, type Readable, type Writable } from "svelte/store";
import type { ImgImgNode } from "./imgImgNodes";
import type { RootNode } from "./rootNodes";
import type { TxtImgNode } from "./txtImgNodes";
import type { UploadNode } from "./uploadNode";
import type { GenerationRequest } from "src/lib/generator/generator";

type NodeTypeStrings = "Root" | "TxtImg" | "Upload" | "ImgImg";

const isBranch = tassert<Record<NodeTypeStrings, boolean>>()({
  Root: false,
  TxtImg: true,
  Upload: true,
  ImgImg: true,
} as const);

const isPrimaryBranch = tassert<Record<NodeTypeStrings, boolean>>()({
  Root: false,
  TxtImg: true,
  Upload: true,
  ImgImg: false,
} as const);

const isSecondaryBranch = tassert<Record<NodeTypeStrings, boolean>>()({
  Root: false,
  TxtImg: false,
  Upload: false,
  ImgImg: true,
} as const);

type NodeCategories = TAssert<Record<NodeTypeStrings, "Root" | "Primary" | "Secondary">, {
  Root: "Root",
  TxtImg: "Primary",
  Upload: "Primary",
  ImgImg: "Secondary",
}>;

type NodeParent = TAssert<Record<ValueOf<NodeCategories>, undefined | RootNode | BranchNode>, {
  Root: undefined,
  Primary: RootNode,
  Secondary: BranchNode,
}>;

type NodeChild = TAssert<Record<ValueOf<NodeCategories>, PrimaryBranchNode | SecondaryBranchNode>, {
  Root: PrimaryBranchNode,
  Primary: SecondaryBranchNode,
  Secondary: SecondaryBranchNode,
}>;

type NodeId = TAssert<Record<ValueOf<NodeCategories>, string | undefined>, {
  Root: undefined,
  Primary: string,
  Secondary: string,
}>;

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
  pendingRequests: Stateful<Writable<GenerationRequest[]>>;
  childLeafCount: Readable<number[]>;
  leafCount: Readable<number>;
  lastSelectedId: Stateful<Writable<string | undefined>>;
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
export type SecondaryBranchNode = ImgImgNode;
export type BranchNode = PrimaryBranchNode | SecondaryBranchNode;
export type AnyNode = RootNode | BranchNode;

export function getChildLeafCountStore(
  childrenStore: Readable<SecondaryBranchNode[]>
): {
  childLeafCount: Readable<number[]>;
  leafCount: Readable<number>;
} {
  const childLeafCount: Readable<number[]> = mapUnwrap<
    SecondaryBranchNode,
    number
  >(childrenStore, (child) => child.leafCount);

  const leafCount: Readable<number> = derived(childLeafCount, (children) => {
    if (children.length === 0) return 1;
    else return children.reduce((a, b) => a + b, 0);
  });

  return { childLeafCount, leafCount };
}
