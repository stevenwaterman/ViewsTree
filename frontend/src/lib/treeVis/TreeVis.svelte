<script lang="ts">
  import { afterUpdate } from "svelte";
  import panzoom from "panzoom";
  import type { PanZoom } from "panzoom";
  import VisRoot from "./VisRoot.svelte";

  let container: HTMLDivElement;

  afterUpdate(() => {
    const pan: PanZoom = panzoom(container, {
      minZoom: 0.1,
      maxZoom: 2,
      zoomDoubleClickSpeed: 1,
      smoothScroll: false,
      filterKey: () => true
    });
  });

  let treeContainer: HTMLDivElement;

  function keyPressed(event: KeyboardEvent) {
  }
</script>

<style>
  .tree-container {
    height: 100%;
    width: 100%;
    flex-shrink: 0;
    overflow: hidden;
    outline: none;

    color: var(--textEmphasis);
    border-left: 1px solid;
    border-color: var(--border);
  }

  .pan-container {
    height: 100%;
  }

  .tree-position {
    position: absolute;
    left: 50%;
    right: 50%;
    top: 50%;
    bottom: 50%;

    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: flex-start;
  }
</style>

<div
  class="tree-container"
  bind:this={treeContainer}
  on:mouseenter={() => treeContainer.focus()}
  on:keypress={keyPressed}>
  <div class="pan-container" bind:this={container}>
    <div class="tree-position">
      <VisRoot {treeContainer} />
    </div>
  </div>
</div>