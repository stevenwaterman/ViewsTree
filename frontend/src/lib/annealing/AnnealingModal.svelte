<script lang="ts">
  import type { Readable } from "svelte/store";
  import { imageUrl } from "../generator/generator";
  import { saveStore } from "../persistence/saves";
  import type { TxtImgNode } from "../state/nodeTypes/txtImgNodes";
  import { generationSettingsStore } from "../state/settings";
  import type { SimulatedAnnealing } from "./simulatedAnnealing";

  export let sa: SimulatedAnnealing;

  let samplesStore: Readable<{ current: TxtImgNode; candidate: TxtImgNode }[]>;
  $: samplesStore = sa.sampleStore;

  // The more you have to swap back and forth, the closer the 2 pictures are, and the less impressive it is to win
  let spacePresses: number = 0;
  let currentScore: number = 0;
  let candidateScore: number = 0;

  let sampleIdx: number = 0;

  let totalScore: number;
  $: totalScore = currentScore + candidateScore;

  let currentWinRate: number;
  $: currentWinRate = candidateScore / totalScore;

  let currentWinPercent: string;
  $: currentWinPercent = isNaN(currentWinRate)
    ? "0"
    : (100 * currentWinRate).toFixed(0);

  let temperatureStore: Readable<number>;
  $: temperatureStore = sa.temperatureStore;

  let iterationStore: Readable<number>;
  $: iterationStore = sa.iterationStore;

  /**
   * Starts at 1, tends asymptotically towards 0.5
   * Add this to the winner, and 1-x to the loser
   */
  function winningScore() {
    return (1 + Math.exp(-spacePresses / 4)) / 2;
  }

  function preferCurrent() {
    const score = winningScore();
    currentScore += score;
    candidateScore += 1 - score;
    maybeNext();
  }

  function preferCandidate() {
    const score = winningScore();
    candidateScore += score;
    currentScore += 1 - score;
    maybeNext();
  }

  function skip() {
    currentScore += 0.5;
    candidateScore += 0.5;
    maybeNext();
  }

  function maybeNext() {
    if (swap) {
      disableSwap = true;
      swap = false;
    }
    spacePresses = 0;
    sampleIdx++;
    if (sa.shouldStop(currentScore, candidateScore)) {
      sa.next(currentScore, candidateScore);
      currentScore = 0;
      candidateScore = 0;
      sampleIdx = 0;
    }
  }

  let disableSwap: boolean = false;
  let swap: boolean = false;

  function keydown(event: KeyboardEvent) {
    if (!disableSwap && !swap && event.code === "Space") {
      swap = true;
      spacePresses++;
    }
  }

  function keyup(event: KeyboardEvent) {
    if (event.code === "Space") {
      swap = false;
      disableSwap = false;
    }
  }
</script>

<svelte:body on:keydown={keydown} on:keyup={keyup} />

<p>Step {$iterationStore}/{sa.steps} - {$temperatureStore.toFixed(2)}°</p>
<p>{currentWinPercent}% of {sampleIdx}</p>

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
  {/if}

  <!-- svelte-ignore a11y-missing-attribute -->
  <div
    class="fakeImage current"
    style={`width: ${$generationSettingsStore.width}px; height: ${$generationSettingsStore.height}px;`}
  >
    Generating...
  </div>

  <!-- svelte-ignore a11y-missing-attribute -->
  <div
    class="fakeImage candidate"
    style={`width: ${$generationSettingsStore.width}px; height: ${$generationSettingsStore.height}px;`}
  >
    Generating...
  </div>

  <button
    disabled={!$samplesStore[sampleIdx]}
    on:click={skip}
    on:keypress|preventDefault
    on:keydown|preventDefault>Skip</button
  >
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
    z-index: 1;
  }

  .fakeImage {
    background: repeating-conic-gradient(
        var(--border) 0% 25%,
        var(--bgDark) 0% 50%
      )
      50% / 32px 32px;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 2rem;
    user-select: none;
    color: white;
    font-weight: bold;
    z-index: 0;
  }

  .candidate {
    grid-row: 1;
    grid-column: 2;
  }

  .current {
    grid-row: 1;
    grid-column: 1;
  }
</style>
