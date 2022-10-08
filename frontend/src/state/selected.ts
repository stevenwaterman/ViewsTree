import { derived, writable, type Readable, type Writable } from "svelte/store";
import { treeStore, type NodeState } from "./tree";

const internalSelectedStore: Writable<NodeState | undefined> = writable(undefined);

function selectParent() {
  internalSelectedStore.update(node => {
    if (node === undefined) return node;
    if (node.type === "root") return undefined;
    return node.parent;
  });
}

function selectChild() {
  internalSelectedStore.update(node => {
    if (node === undefined) return treeStore.state[0];
    
    const children = node.children.state;
    if (children.length === 0) return node;
    return children[0];
  })
}

function selectNext() {
  internalSelectedStore.update(node => {
    if (node === undefined) return undefined;

    const siblings: NodeState[] = node.type === "root" ? treeStore.state : node.parent.children.state;
    const idx = siblings.indexOf(node);
    const newIdx = (idx + 1) % siblings.length;
    return siblings[newIdx];
  })
}

function selectPrev() {
  internalSelectedStore.update(node => {
    if (node === undefined) return undefined;

    const siblings: NodeState[] = node.type === "root" ? treeStore.state : node.parent.children.state;
    const idx = siblings.indexOf(node);
    const newIdx = (siblings.length + idx - 1) % siblings.length;
    return siblings[newIdx];
  })
}

function onRemovedNode(deletedNode: NodeState) {
  internalSelectedStore.update(selectedNode => {
    // Currently a root, therefore no ancestors
    if (selectedNode === undefined) return undefined;

    const ancestors: NodeState[] = [deletedNode];
    let pointerNode: NodeState = deletedNode;
    while (pointerNode.type === "branch") {
      pointerNode = pointerNode.parent;
      ancestors.push(pointerNode);
    }

    // Deleted node was not an ancestor
    if (!ancestors.includes(selectedNode)) return selectedNode;
    if (deletedNode.type === "root") return undefined;
    return deletedNode.parent;
  });
}

export const selectedStore = {
  ...internalSelectedStore,
  selectChild,
  selectParent,
  selectNext,
  selectPrev,
  onRemovedNode
};

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
