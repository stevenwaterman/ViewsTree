import { writable, type Writable } from "svelte/store";
import { comfyStore } from "./models";
import type { ImgImgRequest } from "./nodeTypes/imgImgNodes";
import type { BranchNode } from "./nodeTypes/nodes";
import type { TxtImgRequest } from "./nodeTypes/txtImgNodes";
import { selectedStore } from "./selected";

export type GenerationSettings = TxtImgRequest & ImgImgRequest;

export function randomSeed() {
  return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
}

function getDefaultGenerationSettings(): GenerationSettings {
  return {
    checkpoint: "",
    vae: "",
    clip: "",
    sampler_name: "euler",
    scheduler: "normal",
    unet_weight_dtype: "default",
    clip_type: "stable_diffusion",
    prompt: "",
    negativePrompt: "",
    width: 512,
    height: 512,
    steps: 20,
    scale: 7,
    strength: 0.7,
  };
}

function copySettings(
  current: GenerationSettings,
  node: BranchNode
): GenerationSettings {
  const newSettings: GenerationSettings = { ...current };

  if ("checkpoint" in node) {
    newSettings.checkpoint = node.checkpoint;
    newSettings.vae = node.vae;
    newSettings.clip = node.clip;
    newSettings.sampler_name = node.sampler_name;
    newSettings.scheduler = node.scheduler;
    newSettings.unet_weight_dtype = node.unet_weight_dtype;
    newSettings.clip_type = node.clip_type;
  }

  if ("prompt" in node) newSettings.prompt = node.prompt;
  if ("negativePrompt" in node)
    newSettings.negativePrompt = node.negativePrompt;
  if ("width" in node) newSettings.width = node.width;
  if ("height" in node) newSettings.height = node.height;

  if ("steps" in node) newSettings.steps = node.steps;
  if ("scale" in node) newSettings.scale = node.scale;
  if ("strength" in node) newSettings.strength = node.strength;

  if ("seed" in node)
    newSettings.seed = node.seed.random ? undefined : node.seed.actual;

  return newSettings;
}

const generationSettingsStoreInternal: Writable<GenerationSettings> = writable(
  getDefaultGenerationSettings()
);

comfyStore.subscribe((models) => {
  generationSettingsStoreInternal.update((settings) => {
    const next = { ...settings };
    if (!next.checkpoint) {
        if (models.diffusion_models.length > 0) next.checkpoint = models.diffusion_models[0];
        else if (models.checkpoints.length > 0) next.checkpoint = models.checkpoints[0];
    }
    if (!next.vae && models.vaes.length > 0) next.vae = models.vaes[0];
    if (!next.clip && models.clips.length > 0) next.clip = models.clips[0];
    if (!next.sampler_name && models.samplers.length > 0)
      next.sampler_name = models.samplers[0];
    if (!next.scheduler && models.schedulers.length > 0)
      next.scheduler = models.schedulers[0];
    
    if (next.unet_weight_dtype === "default" && models.unet_weight_dtypes.length > 0 && !models.unet_weight_dtypes.includes("default"))
        next.unet_weight_dtype = models.unet_weight_dtypes[0];
    
    if (next.clip_type === "stable_diffusion" && models.clip_types.length > 0 && !models.clip_types.includes("stable_diffusion"))
        next.clip_type = models.clip_types[0];

    return next;
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
};

selectedStore.subscribe((selected) => {
  if (selected.isBranch) generationSettingsStore.copySettings(selected);
});