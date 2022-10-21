<script lang="ts">
  import TreeVis from "./lib/treeVis/TreeVis.svelte";
  import ViewPanel from "./lib/viewer/ViewPanel.svelte";
  import GeneratorPanel from "./lib/generator/GeneratorPanel.svelte";
  import { selectedStore } from "./lib/state/selected";
  import { generationSettingsStore, saveNameStore } from "./lib/state/settings";
  import { removeNode } from "./lib/state/tree";
  import { cancelRequest, queueGeneration } from "./lib/generator/generator";
  import FileSelectorModal from "./lib/upload/FileSelectorModal.svelte";
  import Modal from "svelte-simple-modal";
  import { modalComponent } from "./lib/modalStore";
  import { loadRootNode, rootNodeStore } from "./lib/state/nodeTypes/rootNodes";
  import { loadNode } from "./lib/state/nodeTypes/nodes";

  function onKeydown(event: KeyboardEvent) {
    if (event.key === "ArrowUp") selectedStore.selectParent();
    else if (event.key === "ArrowRight") selectedStore.selectNext();
    else if (event.key === "ArrowLeft") selectedStore.selectPrev();
    else if (event.key === "ArrowDown") selectedStore.selectChild();
    else if (event.key === "d" && $selectedStore.isBranch)
      removeNode($selectedStore);
    else if (event.key === "r")
      queueGeneration($saveNameStore, $generationSettingsStore, $selectedStore);
    else if (event.key === "c") cancelRequest($selectedStore);
    else if (event.key === "a") modalComponent.open(FileSelectorModal);
    else if (event.key === "s")
      console.log(JSON.stringify($rootNodeStore.serialise()));
  }
</script>

<svelte:body on:keydown={onKeydown} />

<Modal show={$modalComponent}>
  <div class="topGrid">
    <div class="leftGrid">
      <ViewPanel />
      <GeneratorPanel />
    </div>

    <TreeVis />
  </div>
</Modal>

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
