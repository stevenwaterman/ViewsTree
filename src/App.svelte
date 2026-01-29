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

  let previewWidth = Number(localStorage.getItem("previewWidth") || 45); // vmin
  let previewHeight = Number(localStorage.getItem("previewHeight") || 45); // vmin
  let isResizing = false;

  function startResizing(event: MouseEvent) {
    event.preventDefault();
    isResizing = true;
    const startX = event.clientX;
    const startY = event.clientY;
    const vmin = Math.min(window.innerWidth, window.innerHeight);
    const startWidthPx = (previewWidth * vmin) / 100;
    const startHeightPx = (previewHeight * vmin) / 100;

    function onMouseMove(moveEvent: MouseEvent) {
      const deltaX = startX - moveEvent.clientX;
      const deltaY = moveEvent.clientY - startY;
      const newWidthPx = startWidthPx + deltaX;
      const newHeightPx = startHeightPx + deltaY;
      const currentVmin = Math.min(window.innerWidth, window.innerHeight);
      
      previewWidth = Math.max(10, Math.min(95, (newWidthPx / currentVmin) * 100));
      previewHeight = Math.max(10, Math.min(95, (newHeightPx / currentVmin) * 100));
      
      localStorage.setItem("previewWidth", previewWidth.toString());
      localStorage.setItem("previewHeight", previewHeight.toString());
    }

    function onMouseUp() {
      isResizing = false;
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }

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

    <div 
      class="previewContainer" 
      class:resizing={isResizing}
      style="width: {previewWidth}vmin; height: {previewHeight}vmin;"
    >
      <ViewPanel />
      <!-- Invisible resize trigger -->
      <div class="resizeTrigger" on:mousedown={startResizing}></div>
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
    z-index: 10;
    pointer-events: none;
    border: 1px solid var(--border);
    background-color: var(--bgDark);
    box-shadow: 0 0 1em rgba(0,0,0,0.5);
  }

  .previewContainer :global(.container) {
    pointer-events: auto;
  }

  .previewContainer.resizing :global(.container) {
    pointer-events: none;
  }

  .resizeTrigger {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 30px;
    height: 30px;
    cursor: nesw-resize;
    pointer-events: auto;
    z-index: 20;
  }
</style>