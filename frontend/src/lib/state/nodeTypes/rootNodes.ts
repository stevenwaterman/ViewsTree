import { stateful, type Stateful } from "../../utils";
import { writable, type Readable, type Writable } from "svelte/store";
import {
  getChildLeafCountStore,
  getNodeIsTypes,
  type NodeIsTypes,
  type PrimaryBranchNode,
} from "./nodes";
import type { GenerationRequest } from "../../generator/generator";

export type RootNode = NodeIsTypes<"Root"> & {
  id: undefined;
  parent: undefined;
  children: Stateful<Writable<PrimaryBranchNode[]>>;
  pendingRequests: Stateful<Writable<GenerationRequest[]>>;
  childLeafCount: Readable<number[]>;
  leafCount: Readable<number>;
  lastSelectedId: Stateful<Writable<string | undefined>>;
};

const children = stateful(writable([]));
const { childLeafCount, leafCount } = getChildLeafCountStore(children);
export const rootNode: RootNode = {
  ...getNodeIsTypes("Root"),
  id: undefined,
  parent: undefined,
  children,
  childLeafCount,
  leafCount,
  pendingRequests: stateful(writable([])),
  lastSelectedId: stateful(writable(undefined)),
};
