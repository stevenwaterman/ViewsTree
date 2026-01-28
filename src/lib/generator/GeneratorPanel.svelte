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

  function handleWheelWidth(e: WheelEvent) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -16 : 16;
    $generationSettingsStore.width = Math.max(16, $generationSettingsStore.width + delta);
  }

  function handleWheelHeight(e: WheelEvent) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -16 : 16;
    $generationSettingsStore.height = Math.max(16, $generationSettingsStore.height + delta);
  }

  function handleWheelSelect(e: WheelEvent) {
    const select = e.currentTarget as HTMLSelectElement;
    e.preventDefault();
    const delta = e.deltaY > 0 ? 1 : -1;
    const newIndex = Math.max(0, Math.min(select.options.length - 1, select.selectedIndex + delta));
    if (newIndex !== select.selectedIndex) {
        select.selectedIndex = newIndex;
        select.dispatchEvent(new Event('change'));
    }
  }

  let selectedLora = "";
  function addLora() {
    if (selectedLora) {
        generationSettingsStore.addLora(selectedLora);
        selectedLora = "";
    }
  }

  function stripExtension(filename: string): string {
    return filename.replace(/\.[^/.]+$/, "");
  }

  $: filteredLoras = $comfyStore.loras.filter(
    lora => !$generationSettingsStore.loras.some(l => l.name === lora)
  );
</script>

<div class="container">
  <label for="model_config">Model Config</label>
  <div class="config-row">
    <select 
        class="skinny_select"
        id="model_config" 
        value={$generationSettingsStore.modelConfigId || ""} 
        on:change={handleConfigChange} 
        on:keydown|stopPropagation
        on:wheel={handleWheelSelect}
    >
        <option value="" disabled>Select a config...</option>
        {#each $modelConfigsStore as config}
            <option value={config.id}>{config.name}</option>
        {/each}
    </select>
    <button class="small-btn" on:click={openConfigModal} title="Create new from current">+</button>
    <button class="small-btn" on:click={deleteConfig} title="Delete selected" disabled={!$generationSettingsStore.modelConfigId}>🗑</button>
  </div>

  <label for="lora_select">Add LoRA</label>
  <div class="config-row">
    <select id="lora_select" class="skinny_select" bind:value={selectedLora} on:keydown|stopPropagation on:wheel={handleWheelSelect}>
        {#if filteredLoras.length > 0}
            <option value="">Select LoRA...</option>
            {#each filteredLoras as lora}
                <option value={lora}>{stripExtension(lora)}</option>
            {/each}
        {:else}
            <option value="" disabled>All LoRAs added</option>
        {/if}
    </select>
    <button class="small-btn" on:click={addLora} disabled={!selectedLora}>+</button>
  </div>

  {#each $generationSettingsStore.loras as lora (lora.name)}
    <span class="lora-name" title={lora.name}>{stripExtension(lora.name)}</span>
    <Slider
        label="Strength"
        showLabel={false}
        min={0}
        max={2}
        step={0.05}
        bind:value={lora.strength}
    >
        <button slot="extra" class="small-btn" on:click={() => generationSettingsStore.removeLora(lora.name)}>🗑</button>
    </Slider>
  {/each}

  <div class="gap" />

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
      on:wheel={handleWheelWidth}
      on:keydown|stopPropagation
      step="16"
    />
    <span>x</span>
    <input 
      type="number" 
      value={$generationSettingsStore.height} 
      on:change={handleHeightChange}
      on:blur={handleHeightChange}
      on:wheel={handleWheelHeight}
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
    integer={true}
    bind:value={$generationSettingsStore.steps}
  />
  
  <label for="sampler">Sampler</label>
  <select id="sampler" bind:value={$generationSettingsStore.sampler_name} on:keydown|stopPropagation on:wheel={handleWheelSelect}>
    {#each $comfyStore.samplers as sampler}
      <option value={sampler}>{sampler}</option>
    {/each}
  </select>

  <label for="scheduler">Scheduler</label>
  <select id="scheduler" bind:value={$generationSettingsStore.scheduler} on:keydown|stopPropagation on:wheel={handleWheelSelect}>
    {#each $comfyStore.schedulers as scheduler}
      <option value={scheduler}>{scheduler}</option>
    {/each}
  </select>

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

  {#if $selectedStore.type !== "Root"}
    <Slider
      label="Strength"
      id="strength_slider"
      min={0}
      max={1}
      step={0.05}
      bind:value={$generationSettingsStore.strength}
    />
  {/if}

  <SeedInput />
</div>

<style>
  .container {
    display: grid;
    grid-template-columns: 8em minmax(20em, 1fr);
    column-gap: 1em;
    row-gap: 0.5em;
    padding: 1em;

    height: fit-content;
    width: auto;
    overflow-y: auto;
  }

  .skinny_select {
    width: 0;
  }

  .gap {
    grid-column: span 2;
    height: 1em;
  }

  label {
    user-select: none;
    align-self: center;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  select, textarea, input[type="number"] {
    background: var(--bgLight);
    color: var(--text);
    border: 1px solid var(--border);
    padding: 4px;
    width: 100%;
    box-sizing: border-box;
    min-width: 0;
  }

  textarea {
    min-width: 100%;
  }

  .config-row {
    display: flex;
    flex-direction: row;
    gap: 0.5em;
    min-width: 0;
  }

  .config-row select {
    flex-grow: 1;
    min-width: 0;
  }

  .small-btn {
    width: 2em;
    flex-shrink: 0;
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

  .lora-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
    align-self: center;
    color: var(--text);
    font-size: 0.9em;
  }
</style>