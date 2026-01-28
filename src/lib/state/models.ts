import { writable, type Readable, type Writable, derived } from "svelte/store";
import { stateful, type Stateful } from "../utils";
import { getComfyClient } from "../generator/comfyClient";

export type ComfyModels = {
  checkpoints: string[];
  diffusion_models: string[];
  vaes: string[];
  clips: string[];
  samplers: string[];
  schedulers: string[];
  unet_weight_dtypes: string[];
  clip_types: string[];
};

const initialModels: ComfyModels = {
  checkpoints: [],
  diffusion_models: [],
  vaes: [],
  clips: [],
  samplers: [],
  schedulers: [],
  unet_weight_dtypes: [],
  clip_types: [],
};

const internalComfyStore: Writable<ComfyModels> = writable(initialModels);

export const comfyStore: Stateful<Readable<ComfyModels>> & {
  reload: () => Promise<void>;
} = stateful({
  subscribe: internalComfyStore.subscribe,
  reload: async () => {
    const client = getComfyClient();
    try {
      const [checkpoints, samplerInfo, nodeDefs] = await Promise.all([
        client.getCheckpoints(),
        client.getSamplerInfo(),
        client.getNodeDefs(),
      ]);

      const vaes = (nodeDefs?.["VAELoader"]?.input?.required?.["vae_name"]?.[0] as string[]) || [];
      const clips = (nodeDefs?.["CLIPLoader"]?.input?.required?.["clip_name"]?.[0] as string[]) || [];
      
      const unet_weight_dtypes = (nodeDefs?.["UNETLoader"]?.input?.required?.["weight_dtype"]?.[0] as string[]) || [];
      const clip_types = (nodeDefs?.["CLIPLoader"]?.input?.required?.["type"]?.[0] as string[]) || [];

      // Attempt to find diffusion models from various loader nodes
      let diffusion_models: string[] = [];
      if (nodeDefs?.["UNETLoader"]) {
        diffusion_models = (nodeDefs["UNETLoader"].input?.required?.["unet_name"]?.[0] as string[]) || [];
      } else if (nodeDefs?.["DiffusionModelLoader"]) {
        diffusion_models = (nodeDefs["DiffusionModelLoader"].input?.required?.["unet_name"]?.[0] as string[]) || [];
      }

      if (diffusion_models.length === 0) {
        try {
            const files = await client.getModelFiles("diffusion_models");
            diffusion_models = files.map(f => f.name);
        } catch (e) {
            console.warn("Could not fetch diffusion_models folder directly", e);
        }
      }

      const samplers = (samplerInfo as any)?.sampler?.[0] || [];
      const schedulers = (samplerInfo as any)?.scheduler?.[0] || [];

      internalComfyStore.set({
        checkpoints,
        diffusion_models,
        vaes,
        clips,
        samplers,
        schedulers,
        unet_weight_dtypes,
        clip_types,
      });
    } catch (e) {
      console.error("Failed to load models from ComfyUI", e);
    }
  },
});

comfyStore.reload();

// For backward compatibility during transition
export const modelsStore = stateful(derived(comfyStore, $c => $c.checkpoints));