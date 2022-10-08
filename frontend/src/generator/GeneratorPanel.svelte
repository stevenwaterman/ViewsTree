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
  {#if $selectedStore === undefined}
    <label for="prompt">Prompt</label>
    <textarea id="prompt" bind:value={$generationSettingsStore.prompt} rows={4} />

    <Slider label="Width" id="width_slider" min={64} max={1024} step={64} bind:value={$generationSettingsStore.width} />
    <Slider label="Height" id="height_slider" min={64} max={1024} step={64} bind:value={$generationSettingsStore.height} />
    <Slider label="Steps" id="steps_slider" min={5} max={250} step={5} bind:value={$generationSettingsStore.steps} />
    <Slider label="Scale" id="scale_slider" min={5} max={25} step={0.5} bind:value={$generationSettingsStore.scale} />
    <SeedInput/>
  {:else}
    <label for="prompt">Prompt</label>
    <textarea id="prompt" bind:value={$generationSettingsStore.prompt} rows={4} />

    <Slider label="Steps" id="steps_slider" min={5} max={250} step={5} bind:value={$generationSettingsStore.steps} />
    <Slider label="Scale" id="scale_slider" min={5} max={25} step={0.5} bind:value={$generationSettingsStore.scale} />
    <Slider label="Eta" id="eta_slider" min={0} max={1} step={0.01} bind:value={$generationSettingsStore.eta} />
    <Slider label="Strength" id="strength_slider" min={0} max={1} step={0.01} bind:value={$generationSettingsStore.strength} />
    <SeedInput/>
  {/if}

  <button
    on:click={() => generate($saveNameStore, $generationSettingsStore, $selectedStore)}
    disabled={$generationSettingsStore.prompt.trim().length === 0}
  >
    Generate
  </button>
</div>
