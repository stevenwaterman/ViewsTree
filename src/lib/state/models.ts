import { writable, type Readable, type Writable } from "svelte/store";
import { stateful, type Stateful } from "../utils";
import { getComfyClient } from "../generator/comfyClient";

export type ComfyModels = {
  checkpoints: string[];
  vaes: string[];
  clips: string[];
  samplers: string[];
  schedulers: string[];
};

const initialModels: ComfyModels = {
  checkpoints: [],
  vaes: [],
  clips: [],
  samplers: [],
  schedulers: [],
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
      const samplers = (samplerInfo as any)?.sampler?.[0] || [];
      const schedulers = (samplerInfo as any)?.scheduler?.[0] || [];

      internalComfyStore.set({
        checkpoints,
        vaes,
        clips,
        samplers,
        schedulers,
      });
    } catch (e) {
      console.error("Failed to load models from ComfyUI", e);
    }
  },
});

comfyStore.reload();

// For backward compatibility during transition
export const modelsStore = stateful(derived(comfyStore, $c => $c.checkpoints));
import { derived } from "svelte/store";