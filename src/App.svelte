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
  import SaveMenu from "./lib/persistence/SaveMenu.svelte";
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
        queueInpaint($saveStore, $generationSettingsStore, $selectedStore);
      } else if ($selectedStore.isBranch) {
        queueImgImg($saveStore, $generationSettingsStore, $selectedStore);
      } else {
        queueTxtImg($saveStore, $generationSettingsStore, $selectedStore);
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
    <div class="leftGrid">
      <ViewPanel />
      <SaveMenu />
      <GeneratorPanel />
    </div>

    <TreeVis />
  </div>
</Modal>

<style>
  .topGrid {
    display: grid;
    grid-template-rows: 1fr;
    grid-template-columns: auto 1fr;
    height: 100vh;
    width: 100vw;
    color: var(--text);
    background-color: var(--bgLight);
  }

  .leftGrid {
    min-height: 0;
    display: grid;

    grid-template-rows: auto auto 1fr;
    gap: 3em;
  }
</style>
