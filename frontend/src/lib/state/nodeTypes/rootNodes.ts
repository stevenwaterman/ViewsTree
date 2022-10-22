import { stateful, type Stateful } from "../../utils";
import { writable, type Readable, type Writable } from "svelte/store";
import {
  getChildLeafCountStore,
  getNodeIsTypes,
  loadNode,
  type BaseNode,
  type Serialised,
} from "./nodes";

export type RootNode = { id: undefined } & BaseNode<"Root">;

const children: RootNode["children"] = stateful(writable([]));
const { childLeafCount, leafCount } = getChildLeafCountStore(children);

function createRootNode(): RootNode {
  return {
    ...getNodeIsTypes("Root"),
    id: undefined,
    parent: undefined,
    children,
    childLeafCount,
    leafCount,
    pendingRequests: stateful(writable([])),
    lastSelectedId: stateful(writable(undefined)),
    serialise: () => ({
      id: undefined,
      type: "Root",
      children: children.state.map((child) => child.serialise()),
    }),
  };
}

export function loadRootNode(data: Serialised<"Root">): RootNode {
  const node = createRootNode();
  const children = data.children.map((child) => loadNode(child, node));
  node.children.set(children);
  innerRootNodeStore.set(node);
  return node;
}

const innerRootNodeStore: Writable<RootNode> = writable(createRootNode());

export const rootNodeStore: Stateful<Readable<RootNode>> =
  stateful(innerRootNodeStore);
