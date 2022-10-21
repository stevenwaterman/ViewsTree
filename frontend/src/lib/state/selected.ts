import { stateful } from "../utils";
import { derived, writable, type Readable, type Writable } from "svelte/store";
import type {
  AnyNode,
  BranchNode,
  PrimaryBranchNode,
  SecondaryBranchNode,
} from "./nodeTypes/nodes";
import { rootNodeStore, type RootNode } from "./nodeTypes/rootNodes";

const internalSelectedStore: Writable<AnyNode> = writable(rootNodeStore.state);

function getParent(node: AnyNode): AnyNode {
  if (node.type === "Root") return node;
  return node.parent;
}

function getChild(node: AnyNode): AnyNode {
  const children: BranchNode[] = node.children.state;
  if (children.length === 0) return node;

  const requestedId = node.lastSelectedId.state;
  return children.find((node) => node.id === requestedId) ?? children[0];
}

function getNext(node: AnyNode): AnyNode {
  const siblings: AnyNode[] = node.isBranch
    ? node.parent.children.state
    : [node];

  const idx = siblings.indexOf(node);
  const newIdx = (idx + 1) % siblings.length;
  return siblings[newIdx];
}

function getNextOrPrev(node: AnyNode): AnyNode {
  const siblings: AnyNode[] = node.isBranch
    ? node.parent.children.state
    : [node];
  const idx = siblings.indexOf(node);

  const isLast = idx === siblings.length - 1;
  const requestedIdx = isLast ? idx - 1 : idx + 1;
  const newIdx = (siblings.length + requestedIdx) % siblings.length;

  return siblings[newIdx];
}

function getPrev(node: AnyNode): AnyNode {
  const siblings: AnyNode[] = node.isBranch
    ? node.parent.children.state
    : [node];
  const idx = siblings.indexOf(node);
  const newIdx = (siblings.length + idx - 1) % siblings.length;
  return siblings[newIdx];
}

function onRemovedNode(deletedNode: BranchNode) {
  internalSelectedStore.update((selectedNode) => {
    const ancestors: AnyNode[] = [selectedNode];
    let pointerNode: AnyNode = selectedNode;
    while (pointerNode.isBranch) {
      pointerNode = pointerNode.parent;
      ancestors.push(pointerNode);
    }

    // Deleted node was not an ancestor
    if (!ancestors.includes(deletedNode)) return selectedNode;

    // Deleted node was an ancestor, select its sibling
    const siblingNode = getNextOrPrev(deletedNode);
    if (deletedNode !== siblingNode) return siblingNode;

    // No sibling exists, select parent instead
    return deletedNode.parent;
  });
}

export const selectedStore = stateful({
  ...internalSelectedStore,
  selectChild: () => internalSelectedStore.update(getChild),
  selectParent: () => internalSelectedStore.update(getParent),
  selectNext: () => internalSelectedStore.update(getNext),
  selectPrev: () => internalSelectedStore.update(getPrev),
  onRemovedNode,
});

type Path =
  | [RootNode]
  | [RootNode, PrimaryBranchNode]
  | [RootNode, PrimaryBranchNode, ...SecondaryBranchNode[]];

type BranchPath =
  | []
  | [PrimaryBranchNode]
  | [PrimaryBranchNode, ...SecondaryBranchNode[]];

function getPath(node: AnyNode): Path {
  if (node.type === "Root") return [node];
  if (node.isPrimaryBranch) return [node.parent, node];

  const secondaries: SecondaryBranchNode[] = [];
  let pointer: BranchNode = node;
  while (pointer.isSecondaryBranch) {
    secondaries.unshift(pointer);
    pointer = pointer.parent;
  }

  const primary = pointer as PrimaryBranchNode;
  const root = primary.parent;
  return [root, primary, ...secondaries];
}

export const selectedPathStore: Readable<Path> = derived(
  selectedStore,
  (selected) => getPath(selected)
);

export const selectedBranchPathStore: Readable<BranchPath> = derived(
  selectedPathStore,
  (path) => path.slice(1) as BranchPath
);

export const selectedPathIdStore: Readable<string[]> = derived(
  selectedBranchPathStore,
  (branchPath) => {
    return branchPath.map((node: BranchNode) => node.id);
  }
);

selectedBranchPathStore.subscribe((branchPath) => {
  branchPath.forEach((node: BranchNode) => {
    node.parent.lastSelectedId.set(node.id);
  });
});
