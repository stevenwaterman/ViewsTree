import type { BranchConfig, RootConfig } from "../generator/generator";
import { derived, writable, type Readable, type Writable } from "svelte/store";
import { generationConfigStore } from "./settings";

export type RootState = RootConfig & {
  children: Writable<BranchState[]>;
  pendingChildren: Writable<number>;
  remove: () => void;
}

export function createRootState(config: RootConfig): RootState {
  const remove = () => {
    treeStore.update(tree => tree.filter(root => root.id !== config.id));
  }

  const state: RootState = {
    ...config,
    children: writable([]),
    pendingChildren: writable(0),
    remove
  }

  treeStore.update(tree => [...tree, state]);
  pendingRootsStore.update(count => count - 1);

  return state;
}


export type BranchState = BranchConfig & {
  parent: NodeState;
  children: Writable<BranchState[]>;
  pendingChildren: Writable<number>;
  remove: () => void;
}

export function createBranchState(config: BranchConfig, parent: NodeState): BranchState {
  const remove = () => {
    parent.children.update(children => {
      delete children[config.id];
      return children;
    })
  }

  const state: BranchState = {
    ...config,
    parent,
    children: writable([]),
    pendingChildren: writable(0),
    remove
  }

  parent.children.update(children => [...children, state]);
  parent.pendingChildren.update(count => count - 1);

  return state;
}


export type NodeConfig = RootConfig | BranchConfig;
export type NodeState = RootState | BranchState;

export const treeStore: Writable<RootState[]> = writable([]);
export const pendingRootsStore: Writable<number> = writable(0);

export const selectedStore: Readable<NodeState | undefined> = derived(generationConfigStore, generationConfig => {
  if (generationConfig.type === "root") return undefined;
  else return generationConfig.parent;
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
})
