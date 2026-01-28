import { writable, type Readable, type Writable } from "svelte/store";
import { stateful, type Stateful } from "../utils";

export type ModelConfig = {
  id: string;
  name: string;
  checkpoint: string;
  vae: string;
  clip: string;
  unet_weight_dtype: string;
  clip_type: string;
  supportsCfg: boolean;
  defaultSteps: number;
  defaultSampler: string;
  defaultScheduler: string;
};

const STORAGE_KEY = "viewstree_model_configs";

function loadConfigs(): ModelConfig[] {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch (e) {
    console.error("Failed to parse model configs", e);
    return [];
  }
}

const internalConfigsStore: Writable<ModelConfig[]> = writable(loadConfigs());

const statefulStore = stateful(internalConfigsStore);

export const modelConfigsStore = {
  subscribe: statefulStore.subscribe,
  get state() { return statefulStore.state; },
  addConfig: (configData: Omit<ModelConfig, "id">) => {
    internalConfigsStore.update((configs) => {
      if (configs.find(c => c.name === configData.name)) {
        console.warn(`Model config with name "${configData.name}" already exists.`);
        return configs;
      }
      const newConfig: ModelConfig = {
        ...configData,
        id: Date.now().toString(),
      };
      const next = [...configs, newConfig];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  },
  removeConfig: (id: string) => {
    internalConfigsStore.update((configs) => {
      const next = configs.filter((c) => c.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  },
};
