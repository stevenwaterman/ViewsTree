import type { Writable } from "svelte/store";
import { writable } from "svelte/store";

export const saveNameStore: Writable<string> = writable("test");
export const splitStore: Writable<number> = writable(0);
export const showSidebarStore: Writable<boolean> = writable(false);

