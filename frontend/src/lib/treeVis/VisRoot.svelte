<script lang="ts">
  import type { Readable } from "svelte/store";
  import type { PrimaryBranchNode } from "../state/nodeTypes/nodes";
  import { rootNode } from "../state/nodeTypes/rootNodes";
  import { selectedStore } from "../state/selected";
  import { getPlacements } from "./placement";
  import VisBranch from "./VisBranch.svelte";

  export let treeContainer: HTMLDivElement;

  let childrenStore: Readable<PrimaryBranchNode[]>;
  $: childrenStore = rootNode.children;

  let childLeafCountsStore: Readable<number[]>;
  $: childLeafCountsStore = rootNode.childLeafCount;

  let childrenOffsets: number[];
  $: childrenOffsets = getPlacements($childLeafCountsStore);

  let pendingChildrenStore: Readable<number>;
  $: pendingChildrenStore = rootNode.pendingChildren;

  function leftClick(event: MouseEvent) {
    if (event.button === 0) selectedStore.set(rootNode);
  }
</script>

<style>
  .node {
    display: flex;
    justify-content: center;
    align-items: center;

    width: 50px;
    height: 50px;
    border-radius: 50%;
    outline: none;

    transform: scale(1);
    transform-origin: center;;

    cursor: pointer;
    transition: transform 0.2s ease-in-out, background-color 0.2s ease-in-out;
    background-color: var(--nodeActive);
  }

  .selected {
    box-shadow: 0 0 0 0.2em var(--nodePlaying);
  }

  .node:hover {
    transform: scale(1.1, 1.1);
  }

  .pendingLoad {
    font-size: 18px;
    text-align: center;
    margin: 8px 0 0 0;
    border-radius: 30%;
    width: 100%;
    color: var(--textDark);
    background-color: var(--bgDark);
    border: 2px solid var(--border);
  }

  .placement {
    position: absolute;
    left: -25px;
    z-index: 2;
  }
</style>

{#each $childrenStore as child, idx (child.id)}
  <VisBranch
    node={child}
    {treeContainer}
    depth={1}
    offset={childrenOffsets[idx]}
  />
{/each}
<div class="placement" on:mousedown={leftClick}>
  <div
    class="node"
    class:selected={$selectedStore.type === "Root"}
    tabindex={0}>
    <span class="label">Root</span>
  </div>
  {#if $pendingChildrenStore > 0}
    <p class="pendingLoad">
      +{$pendingChildrenStore}
    </p>
  {/if}
</div>