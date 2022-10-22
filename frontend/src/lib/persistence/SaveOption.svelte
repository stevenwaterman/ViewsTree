<script lang="ts">
  import { saveStore } from "./saves";

  export let saveName: string;

  let selected: boolean;
  $: selected = saveName === $saveStore;

  function remove() {
    if (selected) return;
    saveStore.remove(saveName);
  }
</script>

<div class="row">
  <label>
    <input
      type="radio"
      bind:group={$saveStore}
      name="saveName"
      value={saveName}
    />
    {saveName}
  </label>
  <button on:click={remove} disabled={selected}>X</button>
</div>

<style>
  .row {
    display: flex;
    flex-direction: row;
  }

  label {
    user-select: none;
  }
</style>
