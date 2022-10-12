import { stateful } from "../utils";
import { derived, writable, type Readable, type Writable } from "svelte/store";
import { lastSelectedRootStore, treeStore, type NodeState } from "./tree";

const internalSelectedStore: Writable<NodeState | undefined> = writable(undefined);
internalSelectedStore.subscribe(selectedNode => {
  if (selectedNode === undefined) return;

  if (selectedNode.type === "root") {
    const siblings: NodeState[] = treeStore.state;
    const idx = siblings.indexOf(selectedNode);
    lastSelectedRootStore.set(idx);
  } else {
    const siblings: NodeState[] = selectedNode.parent.children.state;
    const idx = siblings.indexOf(selectedNode);
    console.log(siblings, idx)
    selectedNode.parent.lastSelectedChild.set(idx);
  }
})

function getParent(node: NodeState): NodeState | undefined {
  if (node === undefined) return node;
  if (node.type === "root") return undefined;
  return node.parent;
}

function getChild(node: NodeState | undefined): NodeState | undefined {
  const children = node?.children?.state ?? treeStore.state;
  if (children.length === 0) return node;

  const requestedIdx = node?.lastSelectedChild?.state ?? lastSelectedRootStore.state;
  const clampedIdx = Math.min(children.length, requestedIdx);
  return children[clampedIdx];
}

function getNext(node: NodeState): NodeState | undefined {
  if (node === undefined) return undefined;

  const siblings: NodeState[] = node.type === "root" ? treeStore.state : node.parent.children.state;
  const idx = siblings.indexOf(node);
  const newIdx = (idx + 1) % siblings.length;
  return siblings[newIdx];
}

function getPrev(node: NodeState): NodeState | undefined {
  if (node === undefined) return undefined;

  const siblings: NodeState[] = node.type === "root" ? treeStore.state : node.parent.children.state;
  const idx = siblings.indexOf(node);
  const newIdx = (siblings.length + idx - 1) % siblings.length;
  return siblings[newIdx];
}

function onRemovedNode(deletedNode: NodeState) {
  internalSelectedStore.update(selectedNode => {
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
    const nextNode = getNext(deletedNode);
    if (deletedNode !== nextNode) return nextNode;

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
  onRemovedNode
});

export const selectedPathStore: Readable<string[]> = derived(selectedStore, selected => {
  if (selected === undefined) return [];
  const path: string[] = [];
  let node: NodeState = selected;
  while (node.type === "branch") {
    path.unshift(node.id);
    node = node.parent;
  }
  path.unshift(node.id);
  return path;
});
