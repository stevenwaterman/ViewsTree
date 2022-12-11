<script lang="ts">
  import { generationSettingsStore } from "../state/settings";
  import { SimulatedAnnealing } from "./simulatedAnnealing";
  import AnnealingModal from "./AnnealingModal.svelte";
</script>

{#await SimulatedAnnealing.create($generationSettingsStore, 5, 0.25, 8)}
  <p>Loading</p>
{:then sa}
  <AnnealingModal {sa} />
{/await}
