import type { BranchConfig, RootConfig } from "../generator/generator";
import { derived, writable, type Readable, type Writable } from "svelte/store";
import { generationConfigStore } from "./settings";
import { arrayEqual, mapUnwrap, unwrapStore, unwrapStoreNonNull } from "../utils";
import { map, reduce } from "@accuser/svelte-store-array";

export type RootState = RootConfig & {
  children: Writable<BranchState[]>;
  pendingChildren: Writable<number>;
  childLeafCountStore: Readable<number[]>;
  leafCountStore: Readable<number>;
  remove: () => void;
};

export function createRootState(config: RootConfig): RootState {
  const remove = () => {
    treeStore.update(tree => tree.filter(root => root.id !== config.id));
    generationConfigStore.onRemovedNode(state);
  }

  const children: Writable<BranchState[]> = writable([]);
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
  children: Writable<BranchState[]>;
  pendingChildren: Writable<number>;
  childLeafCountStore: Readable<number[]>;
  leafCountStore: Readable<number>;
  remove: () => void;
};

export function createBranchState(config: BranchConfig, parent: NodeState): BranchState {
  const remove = () => {
    parent.children.update(children => children.filter(child => child.id !== config.id));
    generationConfigStore.onRemovedNode(state);
  }

  const children: Writable<BranchState[]> = writable([]);
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

export const treeStore: Writable<RootState[]> = writable([]);
export const pendingRootsStore: Writable<number> = writable(0);
const treeLeafCountStores = getChildLeafCountStore(treeStore);
export const treeLeafCountStore: Readable<number> = treeLeafCountStores.leafCountStore;
export const rootsLeafCountStore: Readable<number[]> = treeLeafCountStores.childLeafCountStore;
treeLeafCountStore.subscribe(console.log);

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

function getChildLeafCountStore(childrenStore: Readable<NodeState[]>): { childLeafCountStore: Readable<number[]>; leafCountStore: Readable<number> } {
  const unwrappedStore: Readable<number[]> = mapUnwrap<NodeState, number>(childrenStore, child => child.leafCountStore);
  const leafCountStore: Readable<number> = derived(unwrappedStore, childLeafCounts => {
    if (childLeafCounts.length === 0) return 1;
    else return childLeafCounts.reduce((a,b) => a+b, 0);
  });
  return { childLeafCountStore: unwrappedStore, leafCountStore };
}
