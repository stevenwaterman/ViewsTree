import { stateful } from "../utils";
import { derived, writable, type Readable, type Writable } from "svelte/store";
import {
  lastSelectedRootStore,
  treeStore,
  type BranchState,
  type NodeState,
  type RootState,
} from "./tree";

const internalSelectedStore: Writable<NodeState | undefined> =
  writable(undefined);

function getParent(node: NodeState): NodeState | undefined {
  if (node === undefined) return node;
  if (node.type === "root") return undefined;
  return node.parent;
}

function getChild(node: NodeState | undefined): NodeState | undefined {
  const children: NodeState[] = node?.children?.state ?? treeStore.state;
  if (children.length === 0) return node;

  const requestedId =
    node?.lastSelectedId?.state ?? lastSelectedRootStore.state;

  return children.find((node) => node.id === requestedId) ?? children[0];
}

function getNext(node: NodeState): NodeState | undefined {
  if (node === undefined) return undefined;

  const siblings: NodeState[] =
    node.type === "root" ? treeStore.state : node.parent.children.state;
  const idx = siblings.indexOf(node);
  const newIdx = (idx + 1) % siblings.length;
  return siblings[newIdx];
}

function getNextOrPrev(node: NodeState): NodeState | undefined {
  if (node === undefined) return undefined;

  const siblings: NodeState[] =
    node.type === "root" ? treeStore.state : node.parent.children.state;
  const idx = siblings.indexOf(node);

  const isLast = idx === siblings.length - 1;
  const requestedIdx = isLast ? idx - 1 : idx + 1;
  const newIdx = (siblings.length + requestedIdx) % siblings.length;

  return siblings[newIdx];
}

function getPrev(node: NodeState): NodeState | undefined {
  if (node === undefined) return undefined;

  const siblings: NodeState[] =
    node.type === "root" ? treeStore.state : node.parent.children.state;
  const idx = siblings.indexOf(node);
  const newIdx = (siblings.length + idx - 1) % siblings.length;
  return siblings[newIdx];
}

function onRemovedNode(deletedNode: NodeState) {
  internalSelectedStore.update((selectedNode) => {
    if (selectedNode === undefined) return undefined;

    const ancestors: NodeState[] = [selectedNode];
    let pointerNode: NodeState = selectedNode;
    while (pointerNode.type === "branch") {
      pointerNode = pointerNode.parent;
      ancestors.push(pointerNode);
    }

    // Deleted node was not an ancestor
    if (!ancestors.includes(deletedNode)) return selectedNode;

    // Deleted node was an ancestor, select its sibling
    const siblingNode = getNextOrPrev(deletedNode);
    if (deletedNode !== siblingNode) return siblingNode;

    // No sibling exists, select parent instead
    if (deletedNode.type === "branch") return deletedNode.parent;

    // Deleted the last existing node
    return undefined;
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

function getPath(node: NodeState | undefined): NodeState[] {
  if (node === undefined) return [];

  const path: NodeState[] = [];
  let pointer: NodeState = node;
  while (pointer.type === "branch") {
    path.unshift(pointer);
    pointer = pointer.parent;
  }
  path.unshift(pointer);

  return path;
}

export const selectedPathStore: Readable<NodeState[]> = derived(
  selectedStore,
  (selected) => getPath(selected)
);

export const selectedPathIdStore: Readable<string[]> = derived(
  selectedPathStore,
  (selectedPath) => selectedPath.map((node) => node.id)
);

selectedPathStore.subscribe((path) => {
  path.forEach((node) => {
    if (node.type === "root") {
      lastSelectedRootStore.set(node.id);
    } else {
      node.parent.lastSelectedId.set(node.id);
    }
  });
});
