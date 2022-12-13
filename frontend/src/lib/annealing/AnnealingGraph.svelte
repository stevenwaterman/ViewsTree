<script lang="ts">
  import type { Readable, Writable } from "svelte/store";
  import colormap from "colormap";

  export let currentWeightsStore: Readable<Record<string, number>>;
  export let candidateWeightsStore: Readable<Record<string, number>>;
  export let predictedScoresStore: Readable<Record<string, number[]>>;
  export let interestStore: Readable<Record<string, number[]>>;

  let colors: Array<[number, number, number, number]> = colormap({
    colormap: "winter",
    nshades: 101,
    format: "rgba",
  });

  let currentWeights: Record<string, number>;
  $: currentWeights = $currentWeightsStore;

  let candidateWeights: Record<string, number>;
  $: candidateWeights = $candidateWeightsStore;

  let predictedScores: Record<string, number[]>;
  $: predictedScores = $predictedScoresStore;

  let interest: Record<string, number[]>;
  $: interest = $interestStore;

  let models: string[];
  $: models = Object.keys(predictedScores);

  function normalise(map: Record<string, number[]>): Record<string, number[]> {
    let min: number = Number.MAX_SAFE_INTEGER;
    let max: number = Number.MIN_SAFE_INTEGER;
    for (const model in map) {
      for (const value of map[model]) {
        min = Math.min(min, value);
        max = Math.max(max, value);
      }
    }

    const range = max - min;

    const output: Record<string, number[]> = {};
    for (const model in map) {
      output[model] = map[model].map((value) =>
        range === 0 ? 0.5 : (value - min) / range
      );
    }
    return output;
  }

  let normalisedScores: Record<string, number[]>;
  $: normalisedScores = normalise(predictedScores);

  $: console.log(normalisedScores);

  let normalisedInterest: Record<string, number[]>;
  $: normalisedInterest = normalise(interest);

  function getBackgroundColor(
    model: string,
    idx: number,
    score: number,
    interest: number
  ): string {
    if (currentWeights[model] === idx) return "#0066AA";
    if (candidateWeights[model] === idx) return "#00AA00";
    return `hsl(${score * 60}, 100%, ${10 + interest * 50}%)`;
  }
</script>

<div class="grid" style={`grid-template-rows: repeat(${models.length}, 1fr)`}>
  {#each models as model (model)}
    <span>{model}</span>
    {#each normalisedScores[model] as score, idx}
      <div
        class="cell"
        style={`background-color: ${getBackgroundColor(
          model,
          idx,
          score,
          normalisedInterest[model][idx]
        )};`}
      />
    {/each}
  {/each}
</div>

<style>
  span {
    margin-right: 1rem;
  }
  .grid {
    display: grid;
    grid-template-columns: auto repeat(101, 1fr);
    flex-direction: row;
    row-gap: 0.5rem;
    margin-bottom: 2rem;
    min-width: 50vw;
  }

  .cell {
    transition-property: background-color, opacity;
    transition-duration: 1s;
  }
</style>
