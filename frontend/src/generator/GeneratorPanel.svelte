<script lang="ts">
  import Slider from "./Slider.svelte";
  import { generate } from "./generator";
  import { generationSettingsStore, saveNameStore } from "../state/settings";
  import SeedInput from "./SeedInput.svelte";
  import { selectedStore } from "../state/selected";
</script>

<style>
  .container {
    display: grid;
    grid-template-columns: auto auto;
    max-width: 0;
    max-height: 0;
    column-gap: 1em;
    row-gap: 0.5em;
    padding: 1em;
  }

  label {
    user-select: none;
  }
</style>

<div class="container">
  <label for="prompt">Prompt</label>
  <textarea id="prompt" bind:value={$generationSettingsStore.prompt} rows={6} on:keydown|stopPropagation />

  <Slider label="Width" id="width_slider" min={64} max={1024} step={64} bind:value={$generationSettingsStore.width} disabled={$selectedStore !== undefined} />
  <Slider label="Height" id="height_slider" min={64} max={1024} step={64} bind:value={$generationSettingsStore.height} disabled={$selectedStore !== undefined} />
  <Slider label="Steps" id="steps_slider" min={5} max={250} step={5} bind:value={$generationSettingsStore.steps} />
  <Slider label="Scale" id="scale_slider" min={1} max={25} step={1} bind:value={$generationSettingsStore.scale} />
  <Slider label="Eta" id="eta_slider" min={0} max={1} step={0.01} bind:value={$generationSettingsStore.eta} disabled={$selectedStore === undefined} />
  <Slider label="Strength" id="strength_slider" min={0} max={1} step={0.05} bind:value={$generationSettingsStore.strength} disabled={$selectedStore === undefined} />
  
  <label for="color_correction">Color Correction</label>
  <input type="checkbox" id="color_correction" bind:checked={$generationSettingsStore.colorCorrection} disabled={$selectedStore === undefined} on:keydown|stopPropagation />

  <SeedInput/>

  <button
    on:click={() => generate($saveNameStore, $generationSettingsStore, $selectedStore)}
    disabled={$generationSettingsStore.prompt.trim().length === 0}
  >
    Generate
  </button>
</div>
