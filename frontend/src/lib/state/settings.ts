import { writable, type Writable } from "svelte/store";
import type { ImgImgRequest } from "./nodeTypes/imgImgNodes";
import type { BranchNode } from "./nodeTypes/nodes";
import type { TxtImgRequest } from "./nodeTypes/txtImgNodes";
import { selectedStore } from "./selected";

export const saveNameStore: Writable<string> = writable("test");

export type GenerationSettings = TxtImgRequest & ImgImgRequest;

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
  node: BranchNode
): GenerationSettings {
  const newSettings: GenerationSettings = { ...current };

  if ("prompt" in node) newSettings.prompt = node.prompt;
  if ("width" in node) newSettings.width = node.width;
  if ("height" in node) newSettings.height = node.height;

  if ("steps" in node) newSettings.steps = node.steps;
  if ("scale" in node) newSettings.scale = node.scale;
  if ("eta" in node) newSettings.eta = node.eta;
  if ("strength" in node) newSettings.strength = node.strength;
  if ("colorCorrection" in node) newSettings.colorCorrection = node.colorCorrection;

  if ("seed" in node) newSettings.seed = node.seed.random ? undefined : node.seed.actual;

  return newSettings;
}

const generationSettingsStoreInternal: Writable<GenerationSettings> = writable(
  getDefaultGenerationSettings()
);
export const generationSettingsStore = {
  ...generationSettingsStoreInternal,
  copySettings: (node: BranchNode) =>
    generationSettingsStoreInternal.update((current) =>
      copySettings(current, node)
    ),
  copySeed: (node: BranchNode) => {
    if ("seed" in node) {
      generationSettingsStoreInternal.update((current) => ({
        ...current,
        seed: node.seed.actual,
      }))
    }
  },
};
selectedStore.subscribe((selected) => {
  if (selected.isBranch) generationSettingsStore.copySettings(selected);
});
