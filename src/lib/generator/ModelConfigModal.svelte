<script lang="ts">
  import { comfyStore } from "../state/models";
  import { modelConfigsStore, type ModelConfig } from "../state/modelConfigs";
  import { modalComponent } from "../modalStore";

  export let initialConfig: Partial<ModelConfig> = {};
  export let mode: "create" | "edit" = "create";

  let name = mode === "edit" ? (initialConfig.name || "") : "";
  let checkpoint = initialConfig.checkpoint || "";
  let unet_weight_dtype = initialConfig.unet_weight_dtype || "default";
  let vae = initialConfig.vae || "";
  let clip = initialConfig.clip || "";
  let clip_type = initialConfig.clip_type || "stable_diffusion";
  let supportsCfg = initialConfig.supportsCfg !== undefined ? initialConfig.supportsCfg : true;

  // Initialize with first available options if possible and not already provided
  $: if (!checkpoint && $comfyStore.diffusion_models.length > 0) checkpoint = $comfyStore.diffusion_models[0];
  $: if (!vae && $comfyStore.vaes.length > 0) vae = $comfyStore.vaes[0];
  $: if (!clip && $comfyStore.clips.length > 0) clip = $comfyStore.clips[0];
  $: if (unet_weight_dtype === "default" && $comfyStore.unet_weight_dtypes.length > 0 && !$comfyStore.unet_weight_dtypes.includes("default")) unet_weight_dtype = $comfyStore.unet_weight_dtypes[0];
  $: if (clip_type === "stable_diffusion" && $comfyStore.clip_types.length > 0 && !$comfyStore.clip_types.includes("stable_diffusion")) clip_type = $comfyStore.clip_types[0];

  function save() {
    if (!name) return;
    const configData = {
      name,
      checkpoint,
      unet_weight_dtype,
      vae,
      clip,
      clip_type,
      supportsCfg
    };

    if (mode === "edit" && initialConfig.id) {
        modelConfigsStore.updateConfig(initialConfig.id, configData);
    } else {
        modelConfigsStore.addConfig(configData);
    }
    modalComponent.close();
  }
</script>

<div class="modal-content">
  <h2>{mode === "edit" ? "Edit" : "Create"} Model Config</h2>
  
  <div class="field">
    <label for="config_name">Config Name</label>
    <input id="config_name" type="text" bind:value={name} placeholder="e.g. Z-Image Turbo" on:keydown|stopPropagation />
  </div>

  <div class="field">
    <label for="diffusion_model">Diffusion Model</label>
    <select id="diffusion_model" bind:value={checkpoint} on:keydown|stopPropagation>
      {#each $comfyStore.diffusion_models as model}
        <option value={model}>{model}</option>
      {/each}
      {#if $comfyStore.diffusion_models.length === 0}
        {#each $comfyStore.checkpoints as cp}
          <option value={cp}>{cp}</option>
        {/each}
      {/if}
    </select>
  </div>

  <div class="field">
    <label for="unet_weight_dtype">UNET Weight Dtype</label>
    <select id="unet_weight_dtype" bind:value={unet_weight_dtype} on:keydown|stopPropagation>
      {#each $comfyStore.unet_weight_dtypes as dtype}
        <option value={dtype}>{dtype}</option>
      {/each}
    </select>
  </div>

  <div class="field">
    <label for="vae">VAE</label>
    <select id="vae" bind:value={vae} on:keydown|stopPropagation>
      {#each $comfyStore.vaes as v}
        <option value={v}>{v}</option>
      {/each}
    </select>
  </div>

  <div class="field">
    <label for="clip">Text Encoder</label>
    <select id="clip" bind:value={clip} on:keydown|stopPropagation>
      {#each $comfyStore.clips as c}
        <option value={c}>{c}</option>
      {/each}
    </select>
  </div>

  <div class="field">
    <label for="clip_type">Text Encoder Type</label>
    <select id="clip_type" bind:value={clip_type} on:keydown|stopPropagation>
      {#each $comfyStore.clip_types as type}
        <option value={type}>{type}</option>
      {/each}
    </select>
  </div>

  <div class="field">
    <label for="supports_cfg">Supports CFG (Scale)</label>
    <input id="supports_cfg" type="checkbox" bind:checked={supportsCfg} />
  </div>

  <div class="actions">
    <button on:click={() => modalComponent.close()}>Cancel</button>
    <button class="primary" on:click={save} disabled={!name}>Save Config</button>
  </div>
</div>

<style>
  .modal-content {
    display: flex;
    flex-direction: column;
    gap: 1em;
    min-width: 400px;
    padding: 2em;
    color: var(--text);
    background: var(--bgDark);
  }

  h2 {
    margin-top: 0;
    color: var(--textEmphasis);
  }

  .field {
    display: grid;
    grid-template-columns: 1fr 2fr;
    align-items: center;
    gap: 1em;
  }

  label {
    user-select: none;
  }

  input, select {
    background: var(--bgLight);
    color: var(--text);
    border: 1px solid var(--border);
    padding: 6px;
  }

  input[type="checkbox"] {
    width: fit-content;
  }

  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 1em;
    margin-top: 1.5em;
  }

  button {
    padding: 0.5em 1.5em;
    cursor: pointer;
    background: var(--bgLight);
    color: var(--text);
    border: 1px solid var(--border);
  }

  button.primary {
    background: var(--accent);
    color: white;
    border: none;
  }

  button.primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>