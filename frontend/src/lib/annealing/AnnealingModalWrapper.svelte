<script lang="ts">
  import { generationSettingsStore } from "../state/settings";
  import { SimulatedAnnealing } from "./simulatedAnnealing";
  import AnnealingModal from "./AnnealingModal.svelte";
  import AnnealingGraph from "./AnnealingGraph.svelte";
</script>

{#await SimulatedAnnealing.create($generationSettingsStore, 5, 0.25, 8)}
  <p>Loading</p>
{:then sa}
  <AnnealingGraph
    currentWeightsStore={sa.currentModelsStore}
    candidateWeightsStore={sa.candidateModelsStore}
    predictedScoresStore={sa.predictedScoresStore}
    interestStore={sa.mutationInterestStore}
  />
  <AnnealingModal {sa} />
{/await}
