import { stateful } from "../../utils";
import { writable } from "svelte/store";
import {
  getChildLeafCountStore,
  getNodeIsTypes,
  type BaseNode,
} from "./nodes";

export type RootNode = BaseNode<"Root">;

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
