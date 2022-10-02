<script lang="ts">
  import Slider from "./Slider.svelte";
  import { generate } from "./generator";
  import { generationConfigStore, saveNameStore } from "../state/settings";
  import SeedInput from "./SeedInput.svelte";
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
  {#if $generationConfigStore.type === "root"}
    <label for="prompt">Prompt</label>
    <textarea id="prompt" bind:value={$generationConfigStore.prompt} rows={4} />

    <Slider label="Width" id="width_slider" min={64} max={1024} step={64} bind:value={$generationConfigStore.width} />
    <Slider label="Height" id="height_slider" min={64} max={1024} step={64} bind:value={$generationConfigStore.height} />
    <Slider label="Steps" id="steps_slider" min={5} max={250} step={5} bind:value={$generationConfigStore.steps} />
    <Slider label="Scale" id="scale_slider" min={5} max={25} step={0.5} bind:value={$generationConfigStore.scale} />
    <SeedInput/>
  {:else}
    <label for="prompt">Prompt</label>
    <textarea id="prompt" bind:value={$generationConfigStore.prompt} rows={4} />

    <Slider label="Steps" id="steps_slider" min={5} max={250} step={5} bind:value={$generationConfigStore.steps} />
    <Slider label="Scale" id="scale_slider" min={5} max={25} step={0.5} bind:value={$generationConfigStore.scale} />
    <Slider label="Eta" id="eta_slider" min={0} max={1} step={0.01} bind:value={$generationConfigStore.eta} />
    <Slider label="Strength" id="strength_slider" min={0} max={1} step={0.01} bind:value={$generationConfigStore.strength} />
    <SeedInput/>
  {/if}

  <button
    on:click={() => generate($saveNameStore, $generationConfigStore)}
    disabled={$generationConfigStore.prompt.trim().length === 0}
  >
    Generate
  </button>
</div>
