<script lang="ts">
  import { comfyStore } from "../state/models";
  import { modelConfigsStore, type ModelConfig } from "../state/modelConfigs";
  import { modalComponent } from "../modalStore";
  import { generationSettingsStore } from "../state/settings";

  export let initialConfig: Partial<ModelConfig> = {};

  let name = "";
  let checkpoint = initialConfig.checkpoint || "";
  let unet_weight_dtype = initialConfig.unet_weight_dtype || "default";
  let vae = initialConfig.vae || "";
  let clip = initialConfig.clip || "";
  let clip_type = initialConfig.clip_type || "stable_diffusion";
  let supportsCfg = initialConfig.supportsCfg !== undefined ? initialConfig.supportsCfg : true;
  
  let defaultSteps = initialConfig.defaultSteps || $generationSettingsStore.steps;
  let defaultSampler = initialConfig.defaultSampler || $generationSettingsStore.sampler_name;
  let defaultScheduler = initialConfig.defaultScheduler || $generationSettingsStore.scheduler;

  $: isDuplicate = $modelConfigsStore.some(c => c.name.toLowerCase() === name.trim().toLowerCase());

  // Initialize with first available options if possible and not already provided
  $: if (!checkpoint && $comfyStore.diffusion_models.length > 0) checkpoint = $comfyStore.diffusion_models[0];
  $: if (!vae && $comfyStore.vaes.length > 0) vae = $comfyStore.vaes[0];
  $: if (!clip && $comfyStore.clips.length > 0) clip = $comfyStore.clips[0];
  $: if (unet_weight_dtype === "default" && $comfyStore.unet_weight_dtypes.length > 0 && !$comfyStore.unet_weight_dtypes.includes("default")) unet_weight_dtype = $comfyStore.unet_weight_dtypes[0];
  $: if (clip_type === "stable_diffusion" && $comfyStore.clip_types.length > 0 && !$comfyStore.clip_types.includes("stable_diffusion")) clip_type = $comfyStore.clip_types[0];

  function save() {
    if (!name || isDuplicate) return;
    modelConfigsStore.addConfig({
      name: name.trim(),
      checkpoint,
      unet_weight_dtype,
      vae,
      clip,
      clip_type,
      supportsCfg,
      defaultSteps,
      defaultSampler,
      defaultScheduler
    });
    modalComponent.close();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") {
        modalComponent.close();
    } else {
        e.stopPropagation();
    }
  }

  function handleWheelSelect(e: WheelEvent) {
    const select = e.currentTarget as HTMLSelectElement;
    e.preventDefault();
    const delta = e.deltaY > 0 ? 1 : -1;
    let newIndex = select.selectedIndex + delta;

    while (newIndex >= 0 && newIndex < select.options.length && select.options[newIndex].disabled) {
      newIndex += delta;
    }

    if (newIndex >= 0 && newIndex < select.options.length && newIndex !== select.selectedIndex) {
      select.selectedIndex = newIndex;
      select.dispatchEvent(new Event("change"));
    }
  }

  function handleWheelNumber(e: WheelEvent, key: 'defaultSteps') {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -1 : 1;
    if (key === 'defaultSteps') {
        defaultSteps = Math.max(1, Math.min(100, defaultSteps + delta));
    }
  }
</script>

<div class="modal-content">
  <h2>Create Model Config</h2>
  
  <div class="field">
    <label for="config_name">Config Name</label>
    <div class="input-stack">
        <input 
            id="config_name" 
            type="text" 
            bind:value={name} 
            placeholder="e.g. Z-Image Turbo" 
            on:keydown={handleKeydown} 
            class:error={isDuplicate && name.length > 0}
        />
        {#if isDuplicate && name.length > 0}
            <span class="error-text">Name already exists</span>
        {/if}
    </div>
  </div>

  <div class="field">
    <label for="diffusion_model">Diffusion Model</label>
    <select id="diffusion_model" bind:value={checkpoint} on:keydown={handleKeydown} on:wheel={handleWheelSelect}>
      {#each $comfyStore.diffusion_models as model}
        <option value={model}>{model}</option>
      {/each}
      {#if $comfyStore.diffusion_models.length === 0}
        {#each $comfyStore.checkpoints as cp}
          <option value={cp}>{cp} (fallback)</option>
        {/each}
      {/if}
    </select>
  </div>

  <div class="field">
    <label for="unet_weight_dtype">UNET Weight Dtype</label>
    <select id="unet_weight_dtype" bind:value={unet_weight_dtype} on:keydown={handleKeydown} on:wheel={handleWheelSelect}>
      {#each $comfyStore.unet_weight_dtypes as dtype}
        <option value={dtype}>{dtype}</option>
      {/each}
    </select>
  </div>

  <div class="field">
    <label for="vae">VAE</label>
    <select id="vae" bind:value={vae} on:keydown={handleKeydown} on:wheel={handleWheelSelect}>
      {#each $comfyStore.vaes as v}
        <option value={v}>{v}</option>
      {/each}
    </select>
  </div>

  <div class="field">
    <label for="clip">Text Encoder</label>
    <select id="clip" bind:value={clip} on:keydown={handleKeydown} on:wheel={handleWheelSelect}>
      {#each $comfyStore.clips as c}
        <option value={c}>{c}</option>
      {/each}
    </select>
  </div>

  <div class="field">
    <label for="clip_type">Text Encoder Type</label>
    <select id="clip_type" bind:value={clip_type} on:keydown={handleKeydown} on:wheel={handleWheelSelect}>
      {#each $comfyStore.clip_types as type}
        <option value={type}>{type}</option>
      {/each}
    </select>
  </div>

  <div class="field">
    <label for="supports_cfg">Supports CFG (Scale)</label>
    <input id="supports_cfg" type="checkbox" bind:checked={supportsCfg} />
  </div>

  <hr />

  <div class="field">
    <label for="default_steps">Default Steps</label>
    <input id="default_steps" type="number" min="1" max="100" bind:value={defaultSteps} on:keydown={handleKeydown} on:wheel={(e) => handleWheelNumber(e, 'defaultSteps')} />
  </div>

  <div class="field">
    <label for="default_sampler">Default Sampler</label>
    <select id="default_sampler" bind:value={defaultSampler} on:keydown={handleKeydown} on:wheel={handleWheelSelect}>
      {#each $comfyStore.samplers as sampler}
        <option value={sampler}>{sampler}</option>
      {/each}
    </select>
  </div>

  <div class="field">
    <label for="default_scheduler">Default Scheduler</label>
    <select id="default_scheduler" bind:value={defaultScheduler} on:keydown={handleKeydown} on:wheel={handleWheelSelect}>
      {#each $comfyStore.schedulers as scheduler}
        <option value={scheduler}>{scheduler}</option>
      {/each}
    </select>
  </div>

  <div class="actions">
    <button on:click={save} disabled={!name || isDuplicate}>Save Config</button>
  </div>
</div>

<style>
  .modal-content {
    display: flex;
    flex-direction: column;
    gap: 1em;
    width: 80vw;
    max-width: 600px;
    min-width: 300px;
    padding: 2em;
    color: var(--text);
    background: var(--bgDark);
    box-sizing: border-box;
  }

  h2 {
    margin-top: 0;
    color: var(--textDark);
  }

  .field {
    display: grid;
    grid-template-columns: auto 1fr;
    align-items: center;
    gap: 1em;
  }

  .input-stack {
    display: flex;
    flex-direction: column;
    gap: 0.2em;
  }

  label {
    user-select: none;
    min-width: 10em;
  }

  input, select {
    background: var(--bgLight);
    color: var(--text);
    border: 1px solid var(--border);
    padding: 6px;
    width: 0;
    min-width: 100%;
    box-sizing: border-box;
  }

  input.error {
    border-color: #f07178;
    background: #2d2020;
  }

  .error-text {
    color: #f07178;
    font-size: 0.8em;
  }

  input[type="checkbox"] {
    width: fit-content;
    min-width: fit-content;
  }

  hr {
    border: none;
    border-top: 1px solid var(--border);
    margin: 0.5em 0;
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
    background: var(--buttonBg);
    color: var(--text);
    border: 1px solid var(--border);
    transition: background 0.1s;
  }

  button:disabled {
    background: var(--buttonBgDisabled);
    opacity: 0.5;
    cursor: not-allowed;
  }

  button:active:not(:disabled) {
    background: var(--buttonBgDisabled);
  }
</style>