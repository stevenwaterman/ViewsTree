<script lang="ts">
  import { selectedStore } from "../state/selected";
  import { pendingRootsStore, rootsLeafCountStore, treeStore, type RootState } from "../state/tree";
  import { getPlacements } from "./placement";
  import VisNode from "./VisNode.svelte";

  export let treeContainer: HTMLDivElement;

  let roots: RootState[];
  $: roots = $treeStore;

  let childrenOffsets: number[];
  $: childrenOffsets = getPlacements($rootsLeafCountStore);

  function leftClick(event: MouseEvent) {
    if (event.button === 0) selectedStore.set(undefined);
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

    cursor: pointer;
    transition: transform 0.2s ease-in-out, background-color 0.2s ease-in-out;
    background-color: var(--nodeActive);
  }

  .node:hover {
    transform: scale(1.1, 1.1);
    transform-origin: center;
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

{#each roots as root, idx (root.id)}
  <VisNode
    state={root}
    {treeContainer}
    depth={1}
    offset={childrenOffsets[idx]}
  />
{/each}
<div class="placement" on:mousedown={leftClick}>
  <div
    class="node"
    tabindex={0}>
    <span class="label">Root</span>
  </div>
  {#if $pendingRootsStore > 0}
    <p class="pendingLoad">
      +{$pendingRootsStore}
    </p>
  {/if}
</div>