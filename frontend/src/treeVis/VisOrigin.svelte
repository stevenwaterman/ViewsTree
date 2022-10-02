<script lang="ts">
  import { generateRoot } from "../lib/generator";
  import { saveNameStore } from "../state/settings";
  import { treeStore, type RootState } from "../state/tree";
    import { getPlacements } from "./placement";
  import VisNode from "./VisNode.svelte";

  export let treeContainer: HTMLDivElement;

  let roots: RootState[];
  $: roots = $treeStore;

  let childrenLeafCounts: number[] = [];
  export let leafCount: number;
  $: leafCount = childrenLeafCounts.length === 0 ? 1 : childrenLeafCounts.reduce((a,b) => a+b, 0);

  let childrenOffsets: number[];
  $: childrenOffsets = getPlacements(0, childrenLeafCounts);

  function leftClick(event: MouseEvent) {
    loadMore();
  }

  function loadMore() {
    generateRoot($saveNameStore, { prompt: "hi" })
  }

  function keyPressed(event: KeyboardEvent) {
    if (event.key === "r") return loadMore();
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
    parentOffset={0}
    bind:leafCount={childrenLeafCounts[idx]}
  />
{/each}
<div class="placement">
  <div
    on:mousedown={leftClick}
    on:keypress={keyPressed}
    class="node"
    tabindex={0}>
    <span class="label">Root</span>
  </div>
  <!-- {#if pendingLoad > 0} -->
    <!-- <p -->
      <!-- class="pendingLoad" -->
      <!-- style={toCss({color: colorLookup.textDark, backgroundColor: colorLookup.bgDark, border: "2px solid", borderColor: colorLookup.border})}> -->
      <!-- +{pendingLoad} -->
    <!-- </p> -->
  <!-- {/if} -->
</div>