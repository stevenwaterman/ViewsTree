import type { BranchConfig, RootConfig } from "../lib/generator";
import { derived, writable, type Readable, type Writable } from "svelte/store";

export type RootState = RootConfig & {
  children: Writable<Record<string, BranchState>>;
  remove: () => void;
}

export function createRootState(config: RootConfig): RootState {
  const remove = () => {
    treeStore.update(tree => tree.filter(root => root.id !== config.id));
  }

  const state = {
    ...config,
    children: writable({}),
    remove
  }

  treeStore.update(tree => [...tree, state]);

  return state;
}


export type BranchState = BranchConfig & {
  parent: NodeState;
  children: Writable<Record<string, BranchState>>;
  remove: () => void;
}

export function createBranchState(config: BranchConfig, parent: NodeState): BranchState {
  const remove = () => {
    parent.children.update(children => {
      delete children[config.id];
      return children;
    })
  }

  const state = {
    ...config,
    parent,
    children: writable({}),
    remove
  }

  parent.children.update(children => ({
    ...children,
    [config.id]: state
  }));

  return state;
}



export type NodeConfig = RootConfig | BranchConfig;
export type NodeState = RootState | BranchState;

export const treeStore: Writable<RootState[]> = writable([]);

export const selectedStore: Writable<NodeState | undefined> = writable(undefined);
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
})
