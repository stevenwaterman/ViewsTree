import { writable, type Writable } from "svelte/store";
import { comfyStore } from "./models";
import { modelConfigsStore } from "./modelConfigs";
import type { ImgImgRequest } from "./nodeTypes/imgImgNodes";
import type { BranchNode } from "./nodeTypes/nodes";
import type { TxtImgRequest } from "./nodeTypes/txtImgNodes";
import { selectedStore } from "./selected";

export type GenerationSettings = TxtImgRequest & ImgImgRequest & { 
    modelConfigId?: string;
    supportsCfg: boolean;
};

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
    supportsCfg: true,
    loras: [],
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
    newSettings.loras = node.loras ? JSON.parse(JSON.stringify(node.loras)) : [];
    
    // Attempt to find matching model config ID based on the 5 core parameters
    const configs = modelConfigsStore.state;
    const match = configs.find(c => 
        c.checkpoint === node.checkpoint &&
        c.vae === node.vae &&
        c.clip === node.clip &&
        c.unet_weight_dtype === node.unet_weight_dtype &&
        c.clip_type === node.clip_type
    );
    newSettings.modelConfigId = match?.id;
    newSettings.supportsCfg = match?.supportsCfg ?? true;
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
  applyModelConfig: (configId: string) => {
    const config = modelConfigsStore.state.find(c => c.id === configId);
    if (config) {
        generationSettingsStoreInternal.update(s => ({
            ...s,
            modelConfigId: configId,
            checkpoint: config.checkpoint,
            vae: config.vae,
            clip: config.clip,
            unet_weight_dtype: config.unet_weight_dtype,
            clip_type: config.clip_type,
            supportsCfg: config.supportsCfg,
            scale: config.supportsCfg ? s.scale : 1,
            // Apply defaults from config
            steps: config.defaultSteps ?? s.steps,
            sampler_name: config.defaultSampler ?? s.sampler_name,
            scheduler: config.defaultScheduler ?? s.scheduler
        }));
    }
  },
  addLora: (name: string) => {
    generationSettingsStoreInternal.update(s => {
        if (s.loras.find(l => l.name === name)) return s;
        return {
            ...s,
            loras: [...s.loras, { name, strength: 1.0 }]
        };
    });
  },
  removeLora: (name: string) => {
    generationSettingsStoreInternal.update(s => ({
        ...s,
        loras: s.loras.filter(l => l.name !== name)
    }));
  },
  updateLoraStrength: (name: string, strength: number) => {
    generationSettingsStoreInternal.update(s => {
        return {
            ...s,
            loras: s.loras.map(l => l.name === name ? { ...l, strength } : l)
        };
    });
  },
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
