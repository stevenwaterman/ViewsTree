<script lang="ts">
  import TreeVis from "./treeVis/TreeVis.svelte";
  import Modal from "svelte-simple-modal";
  import { splitStore, showSidebarStore } from "./state/settings";

  function keyPressed(event: KeyboardEvent) {
    if (event.key === " ") {
      console.log(event);
      if (event.target !== null && "tagName" in event.target) {
        const tagName: string = event.target["tagName"];
        if (tagName !== "INPUT" && tagName !== "TEXTAREA") {
          event.preventDefault();
          // togglePlayback();
        }
      }
    } else if (event.key === "z" && event.ctrlKey) {
      event.preventDefault();
      // undoStore.undo();
    }
  }
</script>

<style>
  .grid {
    display: grid;
    grid-template-rows: 1fr 46px;
    height: 100vh;
    width: 100vw;
    color: var(--text);
  }

  :global(body) {
    padding: 0;
    margin: 0;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    position: fixed;
  }

  :global(a) {
    color: #c3e88d;
  }

  :global(a:active) {
    color: #c3e88d;
  }

  :global(a:visited) {
    color: #c3e88d;
  }

  .openSidebarArrow {
    position: fixed;
    top: 8px;
    right: 8px;
    color: var(--text);
    font-size: 20px;
    font-weight: 600;
    opacity: 50%;
    cursor: pointer;
    z-index: 999;
  }

  .closeSidebarArrow {
    position: absolute;
    top: 8px;
    left: 8px;
    color: var(--text);
    font-size: 20px;
    font-Weight: 600;
    opacity: 50%;
    cursor: pointer;
  }

  .trackContainer {
    grid-column: 1;
    grid-row: 1;
    min-height: 0;
  }

  .treeContainer {
    position: relative;
    grid-column: 2;
    grid-row: 1;
    min-height: 0;
  }

  .controlsContainer {
    grid-column: 1 / span 3;
    grid-row: 2;
    min-height: 0;
  }

  .sidebarContainer {
    position: relative;
    grid-column: 3;
    grid-row: 1;
    overflow-y: auto;
    overflow-x: hidden;
    display: flex;
    flex-direction: column;
    background-color: var(--bgDark);
    border-left: 1px solid var(--border);
    padding: 12px;
  }

  .optionsHeader {
    text-align: center;
    color: var(--text);
    margin: 0;
  }
</style>

<svelte:body on:keypress={keyPressed} />

<Modal>
  <div
    class="grid"
    style={`grid-template-columns: ${$splitStore}fr ${100 - $splitStore}fr ${$showSidebarStore ? '300px' : ''};`}
  >
    {#if !$showSidebarStore}
      <div
        class="openSidebarArrow"
        on:click|capture={() => showSidebarStore.set(true)}>
        &lt;
      </div>
    {/if}
    <div class="trackContainer" style={`display: ${$splitStore === 0 ? 'none' : 'initial'};`}>
      <!-- <Track /> -->
    </div>
    <div class="treeContainer" style={`display: ${$splitStore === 100 ? 'none' : 'initial'};`}>
      <TreeVis />
    </div>
    <div class="controlsContainer">
      <!-- <TrackControls /> -->
    </div>
    {#if $showSidebarStore}
      <div class="sidebarContainer">
        <div class="closeSidebarArrow" on:click={() => showSidebarStore.set(false)}>
          &gt;
        </div>
        <h1 class="optionsHeader">
          Options
        </h1>
        <!-- <GenerationOptions /> -->
        <!-- <DisplayOptions /> -->
        <!-- <TrackInfo /> -->
      </div>
    {/if}
  </div>
</Modal>
