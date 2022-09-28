import type { BranchConfig, RootConfig } from "../lib/generator";
import { derived, writable, type Readable, type Writable } from "svelte/store";

export type RootState = RootConfig & {
  children: Record<string, BranchState>;
  remove: () => void;
}

export function createRootState(config: RootConfig): RootState {
  const remove = () => {
    treeStore.update(tree => tree.filter(root => root.id !== config.id));
  }

  const state = {
    ...config,
    children: {},
    remove
  }

  treeStore.update(tree => [...tree, state]);

  return state;
}


export type BranchState = BranchConfig & {
  parent: NodeState;
  children: Record<string, BranchState>;
  remove: () => void;
}

export function createBranchState(config: BranchConfig, parent: NodeState): BranchState {
  const remove = () => {
    delete parent.children[config.id];
  }

  const state = {
    ...config,
    parent,
    children: {},
    remove
  }

  parent.children[config.id] = state;

  return state;
}



export type NodeConfig = RootConfig | BranchConfig;
export type NodeState = RootState | BranchState;

export const treeStore: Writable<RootState[]> = writable([]);
treeStore.subscribe(console.log)

export const selectedStore: Writable<NodeState | undefined> = writable(undefined);
export const selectedPathStore: Readable<string[]> = derived(selectedStore, selected => {
  const path: string[] = [];
  let node: NodeState | undefined = selected;
  while (node?.type === "branch") {
    path.unshift(node.id);
    node = node.parent;
  }
  return path;
})
