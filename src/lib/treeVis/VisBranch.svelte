<script lang="ts">
  import { thumbnailUrl, type GenerationRequest } from "../generator/generator";
  import {
    getPlacements,
    placementHeight,
    placementTransitionMs,
    placementWidth,
  } from "./placement";
  import { draw, scale } from "svelte/transition";
  import { tweened } from "svelte/motion";
  import { sineInOut } from "svelte/easing";
  import { selectedPathIdStore, selectedStore } from "../state/selected";
  import { generationSettingsStore } from "../state/settings";
  import type { BranchNode } from "../state/nodeTypes/nodes";
  import type { Readable, Writable } from "svelte/store";

  export let node: BranchNode;
  export let treeContainer: HTMLDivElement;
  export let saveName: string;

  export let depth: number;
  export let offset: number;

  function leftClick(event: MouseEvent) {
    if (event.button === 0) {
      if (event.shiftKey) generationSettingsStore.copySettings(node);
      else if (event.ctrlKey) generationSettingsStore.copySeed(node);
      else selectedStore.set(node);
    }
  }

  let childrenStore: Readable<BranchNode[]>;
  $: childrenStore = node.children;

  let children: BranchNode[];
  $: children = $childrenStore ?? [];

  let childLeafCountStore: Readable<number[]>;
  $: childLeafCountStore = node.childLeafCount;

  let childrenOffsets: number[];
  $: childrenOffsets = getPlacements($childLeafCountStore);

  let selected: boolean;
  $: selected = $selectedStore.id === node.id;

  let onSelectedPath: boolean;
  $: onSelectedPath = $selectedPathIdStore.includes(node.id);

  let lastSelectedIdStore: Readable<string | undefined>;
  $: lastSelectedIdStore = node.parent.lastSelectedId;

  let isLastSelected: boolean;
  $: isLastSelected = $lastSelectedIdStore === node.id;

  let edgeColor: string;
  $: edgeColor = onSelectedPath
    ? "var(--edgePlaying)"
    : isLastSelected
    ? "var(--edgeWarm)"
    : "var(--edgeInactive)";

  let edgeZ: number;
  $: edgeZ = onSelectedPath ? 1 : 0;

  let lineTopX: number;
  $: lineTopX = Math.max(-offset, 0) * placementWidth + 5;
  let lineTopXTweened: Writable<number>;
  $: if (lineTopX !== undefined && !isNaN(lineTopX)) {
    if (lineTopXTweened === undefined)
      lineTopXTweened = tweened(lineTopX, {
        duration: placementTransitionMs,
        easing: sineInOut,
      });
    else lineTopXTweened.set(lineTopX);
  }

  let lineBottomX: number;
  $: lineBottomX = offset * placementWidth;
  let lineBottomXTweened: Writable<number>;
  $: if (lineBottomX !== undefined && !isNaN(lineBottomX)) {
    if (lineBottomXTweened === undefined)
      lineBottomXTweened = tweened(lineBottomX, {
        duration: placementTransitionMs,
        easing: sineInOut,
      });
    else lineBottomXTweened.set(lineBottomX);
  }

  let ch: number;
  $: ch = placementHeight / 2;

  let lineWidth: number;
  $: lineWidth = Math.abs(offset) * placementWidth + 10;

  let lineLeft: number;
  $: lineLeft = Math.min(offset, 0) * placementWidth - 5;

  let pendingRequests: Readable<{
    requests: GenerationRequest[];
    running: boolean;
  }>;
  $: pendingRequests = node.pendingRequests;
</script>

<div
  class="anchor"
  style={`top: ${placementHeight}px; left: ${
    placementWidth * offset
  }px; transition-duration: ${placementTransitionMs}ms;`}
>
  <div
    class="placement"
    style={`transition-duration: ${placementTransitionMs}ms;`}
    on:mousedown={leftClick}
  >
    <!-- svelte-ignore a11y-missing-attribute -->
    <img
      src={thumbnailUrl(saveName, node)}
      class="thumbnail"
      class:selected
      in:scale={{
        delay: placementTransitionMs * 0.75,
        duration: placementTransitionMs * 0.25,
      }}
    />
    {#if $pendingRequests.requests.length > 0}
      <p
        class="pendingLoad"
        class:running={$pendingRequests.running}
        transition:scale|local={{ duration: placementTransitionMs }}
      >
        +{$pendingRequests.requests.length}
      </p>
    {/if}
  </div>
  {#each children as child, idx (child.id)}
    <svelte:self
      node={child}
      depth={depth + 1}
      offset={childrenOffsets[idx]}
      {saveName}
      {treeContainer}
    />
  {/each}
</div>
<svg
  class="line"
  width={lineWidth + 5}
  height={ch * 2 + 2}
  style={`left: ${lineLeft}px; top: ${24}px; z-index: ${edgeZ}; transition-duration: ${placementTransitionMs}ms;`}
>
  {#if lineTopXTweened && lineBottomXTweened}
    <path
      class="path"
      d={`m ${$lineTopXTweened} 0 c 0 ${ch + 0.5} ${$lineBottomXTweened} ${
        ch + 0.5
      } ${$lineBottomXTweened} ${ch * 2 + 1}`}
      stroke={edgeColor}
      stroke-width="4px"
      fill="none"
      in:draw={{ duration: placementTransitionMs }}
    />
  {/if}
</svg>

<style>
  .thumbnail {
    grid-column: 1;
    grid-row: 1;

    max-height: 100%;
    max-width: 100%;
    border-radius: 20%;

    transition-property: box-shadow, border;
    transition-timing-function: ease-in-out;
    transition-duration: 0.2s;
  }

  .selected {
    box-shadow: 0 0 0 0.2em var(--nodePlaying);
  }

  .label {
    font-size: 30px;
    grid-column: 1;
    grid-row: 1;
    text-align: center;
    color: var(--text);
  }

  .pendingLoad {
    font-size: 18px;
    text-align: center;
    margin: 8px 0 0 0;
    border-radius: 30%;
    width: 48px;
    color: var(--textDark);
    background-color: var(--bgDark);
    border: 2px solid var(--border);
    box-sizing: border-box;

    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    z-index: 999;

    transition: color 0.2s ease-in-out;
  }

  .running {
    color: var(--nodePlaying);
  }

  .line {
    position: absolute;

    transition-timing-function: ease-in-out;
    transition-property: width, left;
  }

  .path {
    transition: 0.2s ease-in-out stroke;
  }

  .placement {
    position: absolute;
    z-index: 2;

    display: grid;
    grid-template-columns: auto;
    grid-template-rows: auto;
    justify-items: center;
    align-items: center;

    margin-left: -32px;
    width: 64px;
    height: 64px;

    cursor: pointer;
    outline: none;

    transform-origin: center;
    transform: scale(1);

    transition-timing-function: ease-in-out;
    transition-property: transform, background-color, opacity, left;
  }

  .placement:hover {
    transform: scale(1.1);
  }

  .anchor {
    position: absolute;
  }
</style>
