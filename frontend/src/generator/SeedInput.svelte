<script lang="ts">
  import { generationConfigStore } from "../state/settings";
</script>

<style>
  label {
    user-select: none;
  }

  .row {
    display: grid;
    grid-template-columns: 1fr auto;
    column-gap: 1em;
  }
</style>

<label for="seed">Seed</label>
<div class="row">
  <input id="seed" type="number" min={0} max={Number.MAX_SAFE_INTEGER} bind:value={$generationConfigStore.seed} />
  <button disabled={$generationConfigStore.seed === undefined} on:click={() => {$generationConfigStore.seed = undefined}}>X</button>
</div>
