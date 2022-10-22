<script lang="ts">
  import { writable, type Readable } from "svelte/store";
  import type { GenerationRequest } from "../generator/generator";
  import type { PrimaryBranchNode } from "../state/nodeTypes/nodes";
  import { rootNodeStore, type RootNode } from "../state/nodeTypes/rootNodes";
  import { selectedStore } from "../state/selected";
  import { getPlacements, placementTransitionMs } from "./placement";
  import VisBranch from "./VisBranch.svelte";
  import { scale } from "svelte/transition";
  import { saveStore } from "../persistence/saves";

  export let treeContainer: HTMLDivElement;

  let saveName: string;
  $: saveName = $saveStore;

  let rootNode: RootNode;
  $: rootNode = $rootNodeStore;

  let childrenStore: Readable<PrimaryBranchNode[]>;
  $: childrenStore = rootNode.children;

  let childLeafCountsStore: Readable<number[]>;
  $: childLeafCountsStore = rootNode.childLeafCount;

  let childrenOffsets: number[];
  $: childrenOffsets = getPlacements($childLeafCountsStore);

  let pendingRequests: Readable<GenerationRequest[]>;
  $: pendingRequests = rootNode.pendingRequests;

  let requestInProgress: Readable<boolean>;
  $: requestInProgress =
    $pendingRequests.length > 0 ? $pendingRequests[0].started : writable(false);

  function leftClick(event: MouseEvent) {
    if (event.button === 0) selectedStore.set(rootNode);
  }
</script>

{#each $childrenStore as child, idx (child.id)}
  <VisBranch
    node={child}
    depth={1}
    offset={childrenOffsets[idx]}
    {treeContainer}
    {saveName}
  />
{/each}
<div class="placement" on:mousedown={leftClick}>
  <div
    class="node"
    class:selected={$selectedStore.type === "Root"}
    tabindex={0}
  >
    <span class="label">Root</span>
  </div>
  {#if $pendingRequests.length > 0}
    <p
      class="pendingLoad"
      class:running={$requestInProgress}
      transition:scale|local={{ duration: placementTransitionMs }}
    >
      +{$pendingRequests.length}
    </p>
  {/if}
</div>

<style>
  .node {
    display: flex;
    justify-content: center;
    align-items: center;

    width: 48px;
    height: 48px;
    border-radius: 50%;
    outline: none;

    transform: scale(1);
    transform-origin: center;

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
    box-sizing: border-box;

    transition: color 0.2s ease-in-out;
  }

  .running {
    color: var(--nodePlaying);
  }

  .placement {
    position: absolute;
    left: -24px;
    z-index: 2;
  }
</style>
