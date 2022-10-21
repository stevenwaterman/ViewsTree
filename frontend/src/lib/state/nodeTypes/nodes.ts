import { mapUnwrap } from "../../utils";
import { derived, type Readable } from "svelte/store";
import type { ImgImgNode } from "./imgImgNodes";
import type { RootNode } from "./rootNodes";
import type { TxtImgNode } from "./txtImgNodes";
import type { UploadNode } from "./uploadNode";

type NodeTypeStrings = "Root" | "TxtImg" | "Upload" | "ImgImg";

const isBranch = {
  Root: false,
  TxtImg: true,
  Upload: true,
  ImgImg: true,
} as const;

const isPrimaryBranch = {
  Root: false,
  TxtImg: true,
  Upload: true,
  ImgImg: false,
} as const;

const isSecondaryBranch = {
  Root: false,
  TxtImg: false,
  Upload: false,
  ImgImg: true,
} as const;

export type NodeIsTypes<T extends NodeTypeStrings> = {
  type: T;
  isBranch: typeof isBranch[T];
  isPrimaryBranch: typeof isPrimaryBranch[T];
  isSecondaryBranch: typeof isSecondaryBranch[T];
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
