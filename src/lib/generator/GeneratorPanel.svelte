<script lang="ts">
  import Slider from "./Slider.svelte";
  import { generationSettingsStore, randomSeed } from "../state/settings";
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
      const rounded = Math.max(16, roundTo16(val));
      $generationSettingsStore.width = rounded;
      target.value = rounded.toString();
    }
  }

  function handleHeightChange(e: Event) {
    const target = e.target as HTMLInputElement;
    const val = parseInt(target.value);
    if (!isNaN(val)) {
      const rounded = Math.max(16, roundTo16(val));
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
    if (currentId && confirm("Delete this model?")) {
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

  function handleWheelLoraStrength(e: WheelEvent, loraName: string) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    generationSettingsStore.updateLoraStrength(
        loraName, 
        Math.max(0, Math.min(2, ($generationSettingsStore.loras.find(l => l.name === loraName)?.strength || 0) + delta))
    );
  }

  function formatLoraStrength(val: number): string {
    return val.toFixed(1);
  }

  function handleLoraStrengthInput(e: Event, loraName: string) {
    const val = parseFloat((e.target as HTMLInputElement).value);
    if (!isNaN(val)) {
        generationSettingsStore.updateLoraStrength(loraName, val);
    }
  }

  function handleLoraSelect(e: Event) {
    const select = e.target as HTMLSelectElement;
    if (select.value) {
        generationSettingsStore.addLora(select.value);
        select.value = "";
    }
  }

  function stripExtension(filename: string): string {
    return filename.replace(/\.[^/.]+$/, "");
  }

  function handleWheelSeed(e: WheelEvent) {
    if ($generationSettingsStore.seed === undefined) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -1 : 1;
    $generationSettingsStore.seed = Math.max(0, $generationSettingsStore.seed + delta);
  }

  function randomizeSeed() {
    $generationSettingsStore.seed = randomSeed();
  }

  $: filteredLoras = $comfyStore.loras.filter(
    lora => !$generationSettingsStore.loras.some(l => l.name === lora)
  );
</script>

<div class="container">
  <label for="model_config">Model</label>
  <select 
      class="skinny_select"
      id="model_config" 
      value={$generationSettingsStore.modelConfigId || ""} 
      on:change={handleConfigChange} 
      on:keydown|stopPropagation
      on:wheel={handleWheelSelect}
  >
      <option value="" disabled>Select model...</option>
      {#each $modelConfigsStore as config}
          <option value={config.id}>{config.name}</option>
      {/each}
  </select>
  <div class="value-row">
    <button class="small-btn" on:click={openConfigModal} title="Create new from current">+</button>
    <button class="small-btn" on:click={deleteConfig} title="Delete selected" disabled={!$generationSettingsStore.modelConfigId}>🗑</button>
  </div>

  <label>LoRAs</label>
  {#each $generationSettingsStore.loras as lora, i (lora.name)}
    {#if i > 0}<div />{/if}
    <span class="lora-name-inline" title={lora.name}>{stripExtension(lora.name)}</span>
      <div class="value-row">
        <input 
            class="lora-strength"
            type="number" 
            step="0.1" 
            min="0" 
            max="2" 
            title="LoRA Strength"
            value={formatLoraStrength(lora.strength)} 
            on:input={(e) => handleLoraStrengthInput(e, lora.name)}
            on:wheel={(e) => handleWheelLoraStrength(e, lora.name)}
            on:keydown|stopPropagation 
        />
        <button class="small-btn" on:click={() => generationSettingsStore.removeLora(lora.name)} title="Remove LoRA">X</button>
      </div>  {/each}
  
  {#if $generationSettingsStore.loras.length > 0}<div />{/if}
  <select class="skinny_select" on:change={handleLoraSelect} on:keydown|stopPropagation>
      {#if filteredLoras.length > 0}
          <option value="">Add LoRA...</option>
          {#each filteredLoras as lora}
              <option value={lora}>{stripExtension(lora)}</option>
          {/each}
      {:else}
          <option value="" disabled>All LoRAs added</option>
      {/if}
  </select>
  <div />

  <label for="prompt">Prompt</label>
  <textarea
    id="prompt"
    bind:value={$generationSettingsStore.prompt}
    rows={6}
    on:keydown|stopPropagation
    class="span-2"
  />

  {#if $generationSettingsStore.supportsCfg}
    <label for="negativePrompt">Negative<br />Prompt</label>
    <textarea
        id="negativePrompt"
        bind:value={$generationSettingsStore.negativePrompt}
        rows={6}
        on:keydown|stopPropagation
        class="span-2"
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
    <span class="size-separator">x</span>
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
  <div />

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
  <div />

  <label for="scheduler">Scheduler</label>
  <select id="scheduler" bind:value={$generationSettingsStore.scheduler} on:keydown|stopPropagation on:wheel={handleWheelSelect}>
    {#each $comfyStore.schedulers as scheduler}
      <option value={scheduler}>{scheduler}</option>
    {/each}
  </select>
  <div />

  {#if $generationSettingsStore.supportsCfg}
    <Slider
        label="Scale"
        id="scale_slider"
        min={1}
        max={25}
        step={0.5}
        decimals={1}
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
      decimals={1}
      bind:value={$generationSettingsStore.strength}
    />
  {/if}

  <label for="seed">Seed</label>
  <input 
    id="seed" 
    type="number" 
    min={0} 
    max={Number.MAX_SAFE_INTEGER} 
    placeholder="random"
    bind:value={$generationSettingsStore.seed} 
    on:keydown|stopPropagation 
    on:wheel={handleWheelSeed}
  />
  <div class="value-row">
    <button class="small-btn" on:click={randomizeSeed} title="Hardcode random seed">↻</button>
    <button class="small-btn" on:click={() => {$generationSettingsStore.seed = undefined}} disabled={$generationSettingsStore.seed === undefined} title="Clear to random">X</button>
  </div>
</div>

<style>
  .container {
    display: grid;
    grid-template-columns: auto 1fr auto;
    column-gap: 1em;
    row-gap: 0.5em;
    padding: 1em;

    height: fit-content;
    width: auto;
    overflow-y: auto;
  }

  .span-2 {
    grid-column: span 2;
  }

  .value-row {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0.5em;
    justify-content: flex-end;
    justify-self: end;
  }

  .skinny_select {
    width: 0;
    min-width: 100%;
  }

  label {
    user-select: none;
    align-self: center;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    line-height: 1.5;
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
    min-height: 3em;
  }

  .small-btn {
    width: 2em;
    height: 2em;
    flex-shrink: 0;
    cursor: pointer;
    background: var(--bgDark);
    color: var(--text);
    border: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: center;
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
    width: 3em;
  }

  .size-row input:first-child {
    text-align: right;
  }

  .size-row input:last-child {
    text-align: left;
  }

  .size-separator {
    cursor: default;
    user-select: none;
  }

  .container .lora-strength {
    width: 2em;
    text-align: center;
    padding-left: 0;
    padding-right: 0;
  }

  .lora-name-inline {
    align-self: center;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--text);
    font-size: 0.9em;
    width: 0;
    min-width: 100%;
    user-select: none;
  }
</style>