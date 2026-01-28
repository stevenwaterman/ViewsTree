<script lang="ts">
  import Slider from "./Slider.svelte";
  import { generationSettingsStore } from "../state/settings";
  import SeedInput from "./SeedInput.svelte";
  import { selectedStore } from "../state/selected";
  import { comfyStore } from "../state/models";
  import { modelConfigsStore } from "../state/modelConfigs";
  import { modalComponent } from "../modalStore";
  import ModelConfigModal from "./ModelConfigModal.svelte";

  function roundTo16(val: number): number {
    return Math.round(val / 16) * 16;
  }

  function handleWidthChange(e: Event) {
    const target = e.target as HTMLInputElement;
    const val = parseInt(target.value);
    if (!isNaN(val)) {
      const rounded = roundTo16(val);
      $generationSettingsStore.width = rounded;
      target.value = rounded.toString();
    }
  }

  function handleHeightChange(e: Event) {
    const target = e.target as HTMLInputElement;
    const val = parseInt(target.value);
    if (!isNaN(val)) {
      const rounded = roundTo16(val);
      $generationSettingsStore.height = rounded;
      target.value = rounded.toString();
    }
  }

  function handleConfigChange(e: Event) {
    const id = (e.target as HTMLSelectElement).value;
    if (id) {
        generationSettingsStore.applyModelConfig(id);
    }
  }

  function openConfigModal() {
    const currentId = $generationSettingsStore.modelConfigId;
    const currentConfig = modelConfigsStore.state.find(c => c.id === currentId);
    modalComponent.open(ModelConfigModal, { initialConfig: currentConfig });
  }

  function deleteConfig() {
    const currentId = $generationSettingsStore.modelConfigId;
    if (currentId && confirm("Delete this model config?")) {
        modelConfigsStore.removeConfig(currentId);
        $generationSettingsStore.modelConfigId = undefined;
    }
  }
</script>

<div class="container">
  <label for="model_config">Model Config</label>
  <div class="config-row">
    <select id="model_config" value={$generationSettingsStore.modelConfigId || ""} on:change={handleConfigChange} on:keydown|stopPropagation>
        <option value="" disabled>Select a config...</option>
        {#each $modelConfigsStore as config}
            <option value={config.id}>{config.name}</option>
        {/each}
    </select>
    <button class="small-btn" on:click={openConfigModal} title="Create new from current">+</button>
    <button class="small-btn" on:click={deleteConfig} title="Delete selected" disabled={!$generationSettingsStore.modelConfigId}>🗑</button>
  </div>

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

  {#if $generationSettingsStore.supportsCfg}
    <label for="negativePrompt">Negative Prompt</label>
    <textarea
        id="negativePrompt"
        bind:value={$generationSettingsStore.negativePrompt}
        rows={6}
        on:keydown|stopPropagation
    />
  {/if}

  <label>Size</label>
  <div class="size-row">
    <input 
      type="number" 
      value={$generationSettingsStore.width} 
      on:change={handleWidthChange}
      on:blur={handleWidthChange}
      disabled={$selectedStore.isBranch}
      on:keydown|stopPropagation
      step="16"
    />
    <span>x</span>
    <input 
      type="number" 
      value={$generationSettingsStore.height} 
      on:change={handleHeightChange}
      on:blur={handleHeightChange}
      disabled={$selectedStore.isBranch}
      on:keydown|stopPropagation
      step="16"
    />
  </div>

  <Slider
    label="Steps"
    id="steps_slider"
    min={1}
    max={100}
    step={1}
    bind:value={$generationSettingsStore.steps}
  />
  
  {#if $generationSettingsStore.supportsCfg}
    <Slider
        label="Scale"
        id="scale_slider"
        min={1}
        max={25}
        step={0.5}
        bind:value={$generationSettingsStore.scale}
    />
  {/if}

  <Slider
    label="Strength"
    id="strength_slider"
    min={0}
    max={1}
    step={0.05}
    bind:value={$generationSettingsStore.strength}
    disabled={$selectedStore.type === "Root"}
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

  select, textarea, input[type="number"] {
    background: var(--bgDark);
    color: var(--text);
    border: 1px solid var(--border);
    padding: 4px;
  }

  .config-row {
    display: flex;
    flex-direction: row;
    gap: 0.5em;
  }

  .config-row select {
    flex-grow: 1;
  }

  .small-btn {
    width: 2em;
    cursor: pointer;
    background: var(--bgDark);
    color: var(--text);
    border: 1px solid var(--border);
  }

  .small-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .size-row {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0.5em;
  }

  .size-row input {
    width: 5em;
  }
</style>
