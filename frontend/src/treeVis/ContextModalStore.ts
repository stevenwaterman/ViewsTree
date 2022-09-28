import type { BranchState, RootState } from "../state/tree";
import type { Writable } from "svelte/store";
import { writable } from "svelte/store";

export type ContextModalState = {
  coordinates: [number, number];
  state: RootState | BranchState
} | null;

export const contextModalStore: Writable<ContextModalState> = writable(null);
