<script lang="ts">
  import TreeVis from "./lib/treeVis/TreeVis.svelte";
  import ViewPanel from "./lib/viewer/ViewPanel.svelte";
  import GeneratorPanel from "./lib/generator/GeneratorPanel.svelte";
  import { selectedStore } from "./lib/state/selected";
  import { generationSettingsStore } from "./lib/state/settings";
  import {
    cancelRequest,
    queueImgImg,
    queueInpaint,
    queueTxtImg,
  } from "./lib/generator/comfyGenerator";
  import FileSelectorModal from "./lib/upload/FileSelectorModal.svelte";
  import Modal from "svelte-simple-modal";
  import { modalComponent } from "./lib/modalStore";
  import { saveStore } from "./lib/persistence/saves";
  import { removeNode } from "./lib/state/state";
  import { rootNodeStore } from "./lib/state/nodeTypes/rootNodes";
  import Painter from "./lib/paint/Painter.svelte";

  function onKeydown(event: KeyboardEvent) {
    if (event.key === "ArrowUp") selectedStore.selectParent();
    else if (event.key === "ArrowRight") selectedStore.selectNext();
    else if (event.key === "ArrowLeft") selectedStore.selectPrev();
    else if (event.key === "ArrowDown") selectedStore.selectChild();
    else if (event.key === "Delete" && $selectedStore.isBranch)
      removeNode($selectedStore);
    else if (event.key === "r" && !event.ctrlKey) {
      if ($selectedStore.type === "Mask") {
        queueInpaint($saveStore, $generationSettingsStore, $selectedStore).catch(() => {});
      } else if ($selectedStore.isBranch) {
        queueImgImg($saveStore, $generationSettingsStore, $selectedStore).catch(() => {});
      } else {
        queueTxtImg($saveStore, $generationSettingsStore, $selectedStore).catch(() => {});
      }
    }
    else if (event.key === "Backspace") cancelRequest($selectedStore);
    else if (event.key === "a") modalComponent.open(FileSelectorModal);
    else if (
      event.key === "p" &&
      $selectedStore.type !== "Root" &&
      $selectedStore.type !== "Mask"
    )
      modalComponent.open(Painter);
    else if (event.key === "l")
      console.log(JSON.stringify(rootNodeStore.state.serialise()));
  }
</script>

<svelte:body on:keydown={onKeydown} />

<Modal
  show={$modalComponent}
  closeOnOuterClick={false}
  styleWindow={{ width: "fit-content", height: "fit-content", background: "var(--bgDark)", padding: "0" }}
>
  <div class="topGrid">
    <TreeVis />

    <div class="leftGrid">
      <GeneratorPanel />
    </div>

    <div class="previewContainer">
      <ViewPanel />
    </div>
  </div>
</Modal>

<style>
  .topGrid {
    height: 100vh;
    width: 100vw;
    color: var(--text);
    background-color: var(--bgLight);
    position: relative;
  }

  .leftGrid {
    position: fixed;
    top: 1em;
    left: 1em;
    z-index: 10;
    background-color: var(--bgDark);
    border: 1px solid var(--border);
    box-shadow: 0 0 1em rgba(0,0,0,0.5);
    max-height: calc(100vh - 2em);
    overflow-y: auto;
    width: fit-content;
  }

  .previewContainer {
    position: fixed;
    top: 1em;
    right: 1em;
    width: 45vmin;
    height: 45vmin;
    z-index: 10;
    pointer-events: none;
    border: 1px solid var(--border);
    background-color: var(--bgDark);
    box-shadow: 0 0 1em rgba(0,0,0,0.5);
  }

  .previewContainer :global(.container) {
    pointer-events: auto;
  }
</style>