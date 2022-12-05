<script lang="ts">
  import { SimulatedAnnealing } from "./simulatedAnnealing";
  import type { Readable } from "svelte/store";
  import { imageUrl } from "../generator/generator";
  import { saveStore } from "../persistence/saves";
  import type { TxtImgNode } from "../state/nodeTypes/txtImgNodes";
  import { generationSettingsStore } from "../state/settings";
  import { onDestroy } from "svelte";

  let sa = new SimulatedAnnealing($generationSettingsStore, 5, 0.5, 5);

  let samplesStore: Readable<{ current: TxtImgNode; candidate: TxtImgNode }[]>;
  $: samplesStore = sa.sampleStore;

  // Keep going until you hit +- score. +vs score means preferring candidate
  let currentScore: number = 0;
  let candidateScore: number = 0;
  let skipped: number = 0;

  let temperatureStore: Readable<number>;
  $: temperatureStore = sa.temperatureStore;

  let iterationStore: Readable<number>;
  $: iterationStore = sa.iterationStore;

  let sampleIdx: number;
  $: sampleIdx = currentScore + candidateScore + skipped;

  function preferCurrent() {
    currentScore++;
    maybeNext();
  }

  function preferCandidate() {
    candidateScore++;
    maybeNext();
  }

  function skip() {
    skipped++;
    maybeNext();
  }

  function maybeNext() {
    if (sa.shouldStop(currentScore, candidateScore, sampleIdx)) {
      sa.next(currentScore, candidateScore, sampleIdx);
      currentScore = 0;
      candidateScore = 0;
      skipped = 0;
    }
  }

  let swap: boolean = false;

  function keydown(event: KeyboardEvent) {
    if (event.code === "Space") swap = true;
  }

  function keyup(event: KeyboardEvent) {
    if (event.code === "Space") swap = false;
  }

  onDestroy(() => {
    sa.destroy();
  });
</script>

<svelte:body on:keydown={keydown} on:keyup={keyup} />

<p>Step {$iterationStore}/{sa.steps} - {$temperatureStore.toFixed(2)}°</p>
<p>{currentScore} - {candidateScore}</p>

<div class="grid" class:swap>
  {#if $samplesStore[sampleIdx]}
    <!-- svelte-ignore a11y-missing-attribute -->
    <img
      class="current"
      src={imageUrl($saveStore, $samplesStore[sampleIdx].current)}
      on:click={preferCurrent}
    />

    <!-- svelte-ignore a11y-missing-attribute -->
    <img
      class="candidate"
      src={imageUrl($saveStore, $samplesStore[sampleIdx].candidate)}
      on:click={preferCandidate}
    />

    <button on:click={skip} on:keypress|preventDefault on:keydown|preventDefault
      >Skip</button
    >
  {:else}
    <p style="grid-column: span 2">Generating images...</p>
  {/if}
</div>

<style>
  .grid {
    padding: 4rem;
    display: grid;
    grid-template-columns: auto auto;
    column-gap: 1rem;
    row-gap: 1rem;

    justify-items: center;
    align-items: center;
  }

  .swap {
    direction: rtl;
  }

  button {
    grid-column: span 2;
    width: 10rem;
    font-size: 1.5rem;
  }

  img {
    cursor: pointer;
  }
</style>
