import { current_component } from "svelte/internal";
import { writable, type Writable } from "svelte/store";
import { modelsStore } from "./models";
import type { ImgCycleRequest } from "./nodeTypes/ImgCycleNodes";
import type { ImgImgRequest } from "./nodeTypes/imgImgNodes";
import type { BranchNode } from "./nodeTypes/nodes";
import type { TxtImgRequest } from "./nodeTypes/txtImgNodes";
import type { UploadNode } from "./nodeTypes/uploadNode";
import { selectedStore } from "./selected";

export type GenerationSettings = TxtImgRequest &
  ImgImgRequest &
  ImgCycleRequest & { lockModels: boolean };

export function randomSeed() {
  return Math.random() * Number.MAX_SAFE_INTEGER;
}

function getDefaultGenerationSettings(): GenerationSettings {
  return {
    lockModels: false,
    models: { "stable-diffusion-v1-5": 1 },
    sourcePrompt: "",
    prompt: "",
    negativePrompt: "",
    width: 512,
    height: 512,
    steps: 50,
    scale: 7,
    strength: 0.7,
    colorCorrection: false,
  };
}

function copySettings(
  current: GenerationSettings,
  node: BranchNode
): GenerationSettings {
  const newSettings: GenerationSettings = { ...current };

  if ("models" in node && !current.lockModels) {
    newSettings.models = {};
    modelsStore.state.forEach((model) => {
      const weight: number = node.models[model] ?? 0;
      newSettings.models[model] = weight;
    });
  }

  if (node.type === "ImgCycle") newSettings.sourcePrompt = node.sourcePrompt;
  else if ("prompt" in node) newSettings.sourcePrompt = node.prompt;

  if ("prompt" in node) newSettings.prompt = node.prompt;
  if ("negativePrompt" in node)
    newSettings.negativePrompt = node.negativePrompt;
  if ("width" in node) newSettings.width = node.width;
  if ("height" in node) newSettings.height = node.height;

  if ("steps" in node) newSettings.steps = node.steps;
  if ("scale" in node) newSettings.scale = node.scale;
  if ("strength" in node) newSettings.strength = node.strength;
  if ("colorCorrection" in node)
    newSettings.colorCorrection = node.colorCorrection;

  if ("seed" in node)
    newSettings.seed = node.seed.random ? undefined : node.seed.actual;

  return newSettings;
}

const generationSettingsStoreInternal: Writable<GenerationSettings> = writable(
  getDefaultGenerationSettings()
);
modelsStore.subscribe((models) => {
  generationSettingsStoreInternal.update((generationSettings) => {
    const newSettings = { ...generationSettings, models: {} };
    models.forEach((model) => {
      newSettings.models[model] = generationSettings.models[model] ?? 0;
    });
    return newSettings;
  });
});

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
      }));
    }
  },
  copyPromptAsSource: (node: Exclude<BranchNode, UploadNode>) => {
    if ("prompt" in node) {
      generationSettingsStoreInternal.update((current) => ({
        ...current,
        sourcePrompt: node.prompt,
      }));
    }
  },
};
selectedStore.subscribe((selected) => {
  if (selected.isBranch) generationSettingsStore.copySettings(selected);
});
