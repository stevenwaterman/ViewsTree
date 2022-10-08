import type { BranchConfig, RootConfig } from "../generator/generator";
import { derived, writable, type Readable, type Writable } from "svelte/store";
import { mapUnwrap, stateful, type Stateful } from "../utils";
import { selectedStore } from "./selected";

export type RootState = RootConfig & {
  children: Stateful<Writable<BranchState[]>>;
  pendingChildren: Writable<number>;
  childLeafCountStore: Readable<number[]>;
  leafCountStore: Readable<number>;
  remove: () => void;
};

export function createRootState(config: RootConfig): RootState {
  const remove = () => {
    treeStore.update(tree => tree.filter(root => root.id !== config.id));
    selectedStore.onRemovedNode(state);
  }

  const children: Stateful<Writable<BranchState[]>> = stateful(writable([]));
  const { childLeafCountStore, leafCountStore } = getChildLeafCountStore(children);

  const state: RootState = {
    ...config,
    children,
    pendingChildren: writable(0),
    childLeafCountStore,
    leafCountStore,
    remove
  }

  treeStore.update(tree => [...tree, state]);
  pendingRootsStore.update(count => count - 1);

  return state;
}


export type BranchState = BranchConfig & {
  parent: NodeState;
  children: Stateful<Writable<BranchState[]>>;
  pendingChildren: Writable<number>;
  childLeafCountStore: Readable<number[]>;
  leafCountStore: Readable<number>;
  remove: () => void;
};

export function createBranchState(config: BranchConfig, parent: NodeState): BranchState {
  const remove = () => {
    parent.children.update(children => children.filter(child => child.id !== config.id));
    selectedStore.onRemovedNode(state);
  }

  const children: Stateful<Writable<BranchState[]>> = stateful(writable([]));
  const { childLeafCountStore, leafCountStore } = getChildLeafCountStore(children);

  const state: BranchState = {
    ...config,
    parent,
    children,
    pendingChildren: writable(0),
    childLeafCountStore,
    leafCountStore,
    remove
  }

  parent.children.update(children => [...children, state]);
  parent.pendingChildren.update(count => count - 1);

  return state;
}


export type NodeConfig = RootConfig | BranchConfig;
export type NodeState = RootState | BranchState;

export const treeStore: Stateful<Writable<RootState[]>> = stateful(writable([]));
export const pendingRootsStore: Writable<number> = writable(0);
const treeLeafCountStores = getChildLeafCountStore(treeStore);
export const treeLeafCountStore: Readable<number> = treeLeafCountStores.leafCountStore;
export const rootsLeafCountStore: Readable<number[]> = treeLeafCountStores.childLeafCountStore;

function getChildLeafCountStore(childrenStore: Readable<NodeState[]>): { childLeafCountStore: Readable<number[]>; leafCountStore: Readable<number> } {
  const unwrappedStore: Readable<number[]> = mapUnwrap<NodeState, number>(childrenStore, child => child.leafCountStore);
  const leafCountStore: Readable<number> = derived(unwrappedStore, childLeafCounts => {
    if (childLeafCounts.length === 0) return 1;
    else return childLeafCounts.reduce((a,b) => a+b, 0);
  });
  return { childLeafCountStore: unwrappedStore, leafCountStore };
}
