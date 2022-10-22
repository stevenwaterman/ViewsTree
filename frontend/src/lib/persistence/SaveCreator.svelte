<script lang="ts">
  import { saveNameOptionsStore, saveStore } from "./saves";

  let saveName: string = "";

  let existingSaves: string[];
  $: existingSaves = $saveNameOptionsStore;

  let saveValid: boolean;
  $: saveValid = saveName.length > 0 && !existingSaves.includes(saveName);

  function createSave() {
    if (!saveValid) return;
    saveStore.create(saveName);
    saveName = "";
  }

  function keydown(event: KeyboardEvent) {
    if (event.key === "Enter") {
      createSave();
    }
  }
</script>

<div class="row">
  <label>
    Add:
    <input
      type="text"
      bind:value={saveName}
      on:keydown|stopPropagation={keydown}
    />
  </label>

  <button on:click={createSave} disabled={!saveValid}>+</button>
</div>

<style>
  .row {
    display: flex;
    flex-direction: row;
  }
</style>
