import { derived, writable, type Readable, type Writable } from "svelte/store";
import { loadNode, type Serialised } from "../state/nodeTypes/nodes";
import { rootNodeStore } from "../state/nodeTypes/rootNodes";
import { stateful, type Stateful } from "../utils";

const defaultRootData: Serialised<"Root"> = {
  id: undefined,
  type: "Root",
  children: [],
};

const saveNameStoreInternal: Stateful<Writable<string>> = stateful(
  writable("Default")
);
saveNameStoreInternal.subscribe((saveName) => {
  const dataStr: string | null = localStorage.getItem(getEntryName(saveName));
  const data: Serialised<"Root"> =
    dataStr === null ? defaultRootData : JSON.parse(dataStr);
  loadNode(data, undefined);
});

const saveNameOptionsStoreInternal: Stateful<Writable<Record<string, Date>>> =
  createSaveNameOptionsStore();

function createSaveNameOptionsStore(): Stateful<
  Writable<Record<string, Date>>
> {
  const savedDataStr: string | null = localStorage.getItem("saveNames");
  const savedData: Record<string, Date> = JSON.parse(savedDataStr ?? "{}");

  if (!("Default" in savedData)) {
    savedData["Default"] = new Date();
    localStorage.setItem(
      getEntryName("Default"),
      JSON.stringify(defaultRootData)
    );
  }

  const store = stateful(writable(savedData));
  store.subscribe((state) =>
    localStorage.setItem("saveNames", JSON.stringify(state))
  );

  return store;
}

function create(saveName: string) {
  if (saveName in saveNameOptionsStoreInternal.state) return;

  localStorage.setItem(getEntryName(saveName), JSON.stringify(defaultRootData));
  saveNameOptionsStoreInternal.update((saves) => ({
    ...saves,
    [saveName]: new Date(),
  }));
}

function save() {
  localStorage.setItem(
    getEntryName(saveNameStoreInternal.state),
    JSON.stringify(rootNodeStore.state.serialise())
  );
  saveNameOptionsStoreInternal.update((saves) => ({
    ...saves,
    [saveStore.state]: new Date(),
  }));
}

function remove(saveName: string) {
  if (saveName === saveNameStoreInternal.state) return;

  saveNameOptionsStoreInternal.update((saves) => {
    const newSaves = { ...saves };
    delete newSaves[saveName];
    return newSaves;
  });
  localStorage.removeItem(getEntryName(saveName));
}

function getEntryName(saveName: string): string {
  return `treeSave_${saveName}`;
}

export const saveStore = {
  ...saveNameStoreInternal,
  create,
  save,
  remove,
};

export const saveNameOptionsStore: Readable<string[]> = derived(
  saveNameOptionsStoreInternal,
  (options) => {
    const entries = Object.entries(options);
    entries.sort((a, b) => a[1].valueOf() - b[1].valueOf());
    return entries.map((entry) => entry[0]);
  }
);
