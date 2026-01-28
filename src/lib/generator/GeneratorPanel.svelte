<script lang="ts">
  import Slider from "./Slider.svelte";
  import { generationSettingsStore } from "../state/settings";
  import SeedInput from "./SeedInput.svelte";
  import { selectedStore } from "../state/selected";
  import { comfyStore } from "../state/models";
</script>

<div class="container">
  <label for="lock_models">Lock Models</label>
  <input
    type="checkbox"
    id="lock_models"
    bind:checked={$generationSettingsStore.lockModels}
    on:keydown|stopPropagation
  />

  <label for="diffusion_model">Diffusion Model</label>
  <select id="diffusion_model" bind:value={$generationSettingsStore.checkpoint} disabled={$generationSettingsStore.lockModels} on:keydown|stopPropagation>
    {#each $comfyStore.diffusion_models as model}
      <option value={model}>{model}</option>
    {/each}
    {#if $comfyStore.diffusion_models.length === 0}
      {#each $comfyStore.checkpoints as checkpoint}
        <option value={checkpoint}>{checkpoint} (from checkpoints)</option>
      {/each}
    {/if}
  </select>

  <label for="unet_weight_dtype">UNET Weight Dtype</label>
  <select id="unet_weight_dtype" bind:value={$generationSettingsStore.unet_weight_dtype} disabled={$generationSettingsStore.lockModels} on:keydown|stopPropagation>
    {#each $comfyStore.unet_weight_dtypes as dtype}
      <option value={dtype}>{dtype}</option>
    {/each}
  </select>

  <label for="vae">VAE</label>
  <select id="vae" bind:value={$generationSettingsStore.vae} disabled={$generationSettingsStore.lockModels} on:keydown|stopPropagation>
    {#each $comfyStore.vaes as vae}
      <option value={vae}>{vae}</option>
    {/each}
  </select>

  <label for="clip">CLIP</label>
  <select id="clip" bind:value={$generationSettingsStore.clip} disabled={$generationSettingsStore.lockModels} on:keydown|stopPropagation>
    {#each $comfyStore.clips as clip}
      <option value={clip}>{clip}</option>
    {/each}
  </select>

  <label for="clip_type">CLIP Type</label>
  <select id="clip_type" bind:value={$generationSettingsStore.clip_type} disabled={$generationSettingsStore.lockModels} on:keydown|stopPropagation>
    {#each $comfyStore.clip_types as type}
      <option value={type}>{type}</option>
    {/each}
  </select>

  <label for="sampler">Sampler</label>
  <select id="sampler" bind:value={$generationSettingsStore.sampler_name} on:keydown|stopPropagation>
    {#each $comfyStore.samplers as sampler}
      <option value={sampler}>{sampler}</option>
    {/each}
  </select>

  <label for="scheduler">Scheduler</label>
  <select id="scheduler" bind:value={$generationSettingsStore.scheduler} on:keydown|stopPropagation>
    {#each $comfyStore.schedulers as scheduler}
      <option value={scheduler}>{scheduler}</option>
    {/each}
  </select>

  <label for="prompt">Prompt</label>
  <textarea
    id="prompt"
    bind:value={$generationSettingsStore.prompt}
    rows={6}
    on:keydown|stopPropagation
  />

  <label for="negativePrompt">Negative Prompt</label>
  <textarea
    id="negativePrompt"
    bind:value={$generationSettingsStore.negativePrompt}
    rows={6}
    on:keydown|stopPropagation
  />

  <Slider
    label="Width"
    id="width_slider"
    min={64}
    max={2048}
    step={64}
    bind:value={$generationSettingsStore.width}
    disabled={$selectedStore.isBranch}
  />
  <Slider
    label="Height"
    id="height_slider"
    min={64}
    max={2048}
    step={64}
    bind:value={$generationSettingsStore.height}
    disabled={$selectedStore.isBranch}
  />
  <Slider
    label="Steps"
    id="steps_slider"
    min={1}
    max={100}
    step={1}
    bind:value={$generationSettingsStore.steps}
  />
  <Slider
    label="Scale"
    id="scale_slider"
    min={1}
    max={25}
    step={0.5}
    bind:value={$generationSettingsStore.scale}
  />
  <Slider
    label="Strength"
    id="strength_slider"
    min={0}
    max={1}
    step={0.05}
    bind:value={$generationSettingsStore.strength}
    disabled={$selectedStore.type === "Root"}
  />

  <label for="color_correction">Color Correction</label>
  <input
    type="checkbox"
    id="color_correction"
    bind:checked={$generationSettingsStore.colorCorrection}
    disabled={$selectedStore.type === "Root"}
    on:keydown|stopPropagation
  />

  <SeedInput />
</div>

<style>
  .container {
    display: grid;
    grid-template-columns: auto 1fr;
    column-gap: 1em;
    row-gap: 0.5em;
    padding: 1em;

    height: fit-content;
    width: fit-content;
    overflow-y: auto;
  }

  label {
    user-select: none;
    align-self: center;
  }

  select, textarea {
    background: var(--bg);
    color: var(--text);
    border: 1px solid var(--border);
    padding: 4px;
  }
</style>