<script lang="ts">
  import { generationSettingsStore } from "../state/settings";

  function handleWheel(e: WheelEvent) {
    if ($generationSettingsStore.seed === undefined) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -1 : 1;
    $generationSettingsStore.seed = Math.max(0, $generationSettingsStore.seed + delta);
  }
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

  input[type="number"], button {
    background: var(--bgLight);
    color: var(--text);
    border: 1px solid var(--border);
    padding: 4px;
  }

  button {
    cursor: pointer;
    width: 2em;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  button:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
</style>

<label for="seed">Seed</label>
<div class="row">
  <input 
    id="seed" 
    type="number" 
    min={0} 
    max={Number.MAX_SAFE_INTEGER} 
    bind:value={$generationSettingsStore.seed} 
    on:keydown|stopPropagation 
    on:wheel={handleWheel}
  />
  <button disabled={$generationSettingsStore.seed === undefined} on:click={() => {$generationSettingsStore.seed = undefined}}>X</button>
</div>