import type { Writable } from "svelte/store";
import type { BranchNode } from "./nodeTypes/nodes";
import { selectedStore } from "./selected";

export function removeNode(node: BranchNode) {
  selectedStore.onRemovedNode(node);
  const children: Writable<Array<BranchNode>> = node.parent.children;
  children.update((children) =>
    children.filter((child) => child.id !== node.id)
  );
}
