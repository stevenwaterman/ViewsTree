<script lang="ts">
  import TreeVis from "./treeVis/TreeVis.svelte";
  import Modal from "svelte-simple-modal";
  import ViewPanel from "./viewer/ViewPanel.svelte";
  import GeneratorPanel from "./generator/GeneratorPanel.svelte";
    import { selectedStore } from "./state/selected";

  function onKeypress(event: KeyboardEvent) {
    if (event.key === "ArrowUp") selectedStore.selectParent();
    else if (event.key === "ArrowRight") selectedStore.selectNext();
    else if (event.key === "ArrowLeft") selectedStore.selectPrev();
    else if (event.key === "ArrowDown") selectedStore.selectChild();
  }
</script>

<style>
  .topGrid {
    display: grid;
    grid-template-rows: 1fr;
    grid-template-columns: 1fr 2fr;
    height: 100vh;
    width: 100vw;
    color: var(--text);
    background-color: var(--bgLight);
  }

  .leftGrid {
    min-height: 0;
    display: grid;

    grid-template-rows: auto 1fr;
  }
</style>

<Modal>
  <div class="topGrid" on:keydown={onKeypress}>
    <div class="leftGrid">
      <ViewPanel />
      <GeneratorPanel />
    </div>

    <TreeVis />
  </div>
</Modal>
