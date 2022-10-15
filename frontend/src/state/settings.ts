import type { BranchRequest, RootRequest } from "../generator/generator";
import { derived, writable, type Readable, type Writable } from "svelte/store";
import type { NodeState } from "./tree";
import { selectedStore } from "./selected";

export const saveNameStore: Writable<string> = writable("test");

export type GenerationSettings = RootRequest & BranchRequest;

export function randomSeed() {
  return Math.random() * Number.MAX_SAFE_INTEGER;
}

function getDefaultGenerationSettings(): GenerationSettings {
  return {
    prompt: "",
    width: 512,
    height: 512,
    steps: 50,
    scale: 5,
    eta: 0,
    strength: 0.7,
    colorCorrection: true,
  };
}

function copySettings(
  current: GenerationSettings,
  node: NodeState
): GenerationSettings {
  const newSettings: GenerationSettings = {
    ...current,
    prompt: node.prompt,
    steps: node.steps,
    scale: node.scale,
    seed: node.seed.random ? undefined : node.seed.actual,
  };

  if (node.type === "root") {
    newSettings.width = node.width;
    newSettings.height = node.height;
  } else {
    newSettings.eta = node.eta;
    newSettings.strength = node.strength;
    newSettings.colorCorrection = node.colorCorrection;
  }

  return newSettings;
}

const generationSettingsStoreInternal: Writable<GenerationSettings> = writable(
  getDefaultGenerationSettings()
);
export const generationSettingsStore = {
  ...generationSettingsStoreInternal,
  copySettings: (node: NodeState) =>
    generationSettingsStoreInternal.update((current) =>
      copySettings(current, node)
    ),
  copySeed: (node: NodeState) =>
    generationSettingsStoreInternal.update((current) => ({
      ...current,
      seed: node.seed.actual,
    })),
};
selectedStore.subscribe((selected) => {
  if (selected) generationSettingsStore.copySettings(selected);
});
