import { stateful, type Stateful } from "../../utils";
import { writable, type Readable, type Writable } from "svelte/store";
import {
  getChildLeafCountStore,
  getNodeIsTypes,
  type NodeIsTypes,
  type PrimaryBranchNode,
} from "./nodes";

export type RootNode = NodeIsTypes<"Root"> & {
  id: undefined;
  parent: undefined;
  children: Stateful<Writable<PrimaryBranchNode[]>>;
  pendingChildren: Writable<number>;
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
  pendingChildren: writable(0),
  lastSelectedId: stateful(writable(undefined)),
};
