<script lang="ts">
  import { generate } from "../generator/generator";
  import { generationSettingsStore, saveNameStore } from "../state/settings";
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

  function keyPressed(event: KeyboardEvent) {
    // if (event.key === "d") return state.remove();
    if (event.key === "r") return generate($saveNameStore, $generationSettingsStore, undefined);
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

{#each roots as root, idx (root.id)}
  <VisNode
    state={root}
    {treeContainer}
    depth={1}
    offset={childrenOffsets[idx]}
  />
{/each}
<div class="placement" on:mousedown={leftClick} on:keypress={keyPressed}>
  <div
    class="node"
    class:selected={$selectedStore === undefined}
    tabindex={0}>
    <span class="label">Root</span>
  </div>
  {#if $pendingRootsStore > 0}
    <p class="pendingLoad">
      +{$pendingRootsStore}
    </p>
  {/if}
</div>