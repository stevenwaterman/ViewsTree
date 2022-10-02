<script lang="ts">
  import TreeVis from "./treeVis/TreeVis.svelte";
  import Modal from "svelte-simple-modal";
  import ViewPanel from "./viewer/ViewPanel.svelte";
  import GeneratorPanel from "./generator/GeneratorPanel.svelte";
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
  <div class="topGrid">
    <div class="leftGrid">
      <ViewPanel />
      <GeneratorPanel />
    </div>

    <TreeVis />
  </div>
</Modal>
