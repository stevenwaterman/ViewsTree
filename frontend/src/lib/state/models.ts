import { writable, type Readable, type Writable } from "svelte/store";
import { stateful, type Stateful } from "../utils";

const internalModelsStore: Writable<string[]> = writable([]);
export const modelsStore: Stateful<Readable<string[]>> & {
  reload: () => void;
} = stateful({
  subscribe: internalModelsStore.subscribe,
  reload: async () =>
    fetch(`http://localhost:5001/models`, { method: "GET" })
      .then((response) => response.json())
      .then((body: string[]) => internalModelsStore.set(body)),
});
modelsStore.reload();
