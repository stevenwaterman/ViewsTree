<script lang="ts">
  import Slider from "./Slider.svelte";
  import { generationSettingsStore } from "../state/settings";
  import SeedInput from "./SeedInput.svelte";
  import { selectedStore } from "../state/selected";
  import { modelsStore } from "../state/models";

  let lockModels: boolean = false;
</script>

<div class="container">
  <label for="lock_models">Lock Models</label>
  <input
    type="checkbox"
    id="lock_models"
    bind:checked={lockModels}
    on:keydown|stopPropagation
  />

  {#each $modelsStore as model (model)}
    <Slider
      label={model}
      id={`model_${model}_slider`}
      min={0}
      max={10}
      step={0.1}
      bind:value={$generationSettingsStore.models[model]}
      disabled={lockModels}
    />
  {/each}

  <label for="prompt">Source Prompt</label>
  <textarea
    id="source_prompt"
    bind:value={$generationSettingsStore.sourcePrompt}
    rows={6}
    on:keydown|stopPropagation
    disabled={!$selectedStore.isBranch}
  />

  <label for="prompt">Prompt</label>
  <textarea
    id="prompt"
    bind:value={$generationSettingsStore.prompt}
    rows={6}
    on:keydown|stopPropagation
  />

  <Slider
    label="Width"
    id="width_slider"
    min={64}
    max={1024}
    step={64}
    bind:value={$generationSettingsStore.width}
    disabled={$selectedStore.isBranch}
  />
  <Slider
    label="Height"
    id="height_slider"
    min={64}
    max={1024}
    step={64}
    bind:value={$generationSettingsStore.height}
    disabled={$selectedStore.isBranch}
  />
  <Slider
    label="Steps"
    id="steps_slider"
    min={5}
    max={250}
    step={5}
    bind:value={$generationSettingsStore.steps}
  />
  <Slider
    label="Scale"
    id="scale_slider"
    min={1}
    max={25}
    step={1}
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
    grid-template-columns: auto auto;
    column-gap: 1em;
    row-gap: 0.5em;
    padding: 1em;

    height: fit-content;
    width: fit-content;
  }

  label {
    user-select: none;
  }
</style>
