<script lang="ts">
  import type { Readable, Writable } from "svelte/store";
  import { thumbnailUrl } from "../generator/generator";
  import { generationConfigStore, saveNameStore } from "../state/settings";
  import { selectedPathStore, selectedStore, type BranchState, type NodeState } from "../state/tree";
  import { contextModalStore } from "./ContextModalStore";
  import { getPlacements, nodeWidth, placementHeight, placementTransitionMs, placementWidth } from "./placement";
  import { blur, draw, scale } from "svelte/transition";
  import { tweened } from "svelte/motion";
  import { sineInOut } from "svelte/easing";

  export let state: NodeState;
  export let treeContainer: HTMLDivElement;

  export let depth: number;
  export let offset: number;

  function leftClick(event: MouseEvent) {
    if (event.button === 0) {
      if (event.shiftKey) generationConfigStore.siblingof(state);
      else if (event.ctrlKey) generationConfigStore.update(generationConfig => ({
        ...generationConfig,
        seed: state.seed.actual
      }))
      else generationConfigStore.childOf(state);
    }
  }

  function rightClick({ clientX, clientY }: MouseEvent) {
    contextModalStore.set({
      coordinates: [clientX, clientY],
      state
    });
  }

  let childrenStore: Readable<BranchState[]>;
  $: childrenStore = state.children;

  let children: BranchState[];
  $: children = $childrenStore;

  let childrenLeafCounts: number[] = [];
  export let leafCount: number;
  $: leafCount = childrenLeafCounts.length === 0 ? 1 : childrenLeafCounts.reduce((a,b) => a+b, 0);

  let childrenOffsets: number[];
  $: childrenOffsets = getPlacements(childrenLeafCounts);

  let selected: boolean;
  $: selected = $selectedStore?.id === state.id;

  let onSelectedPath: boolean;
  $: onSelectedPath = $selectedPathStore.includes(state.id);

  let edgeColor: string;
  $: edgeColor = onSelectedPath ? "var(--edgePlaying)" : "var(--edgeInactive)";

  let edgeZ: number;
  $: edgeZ = onSelectedPath ? 1 : 0;

  let cw: number;
  $: cw = Math.abs(offset) * (placementWidth / 2);

  let cwTweened: Writable<number>;
  $: if (cw !== undefined && !isNaN(cw)) {
    if (cwTweened === undefined) {
      cwTweened = tweened(cw, { duration: placementTransitionMs, easing: sineInOut });
    } else {
      cwTweened.set(cw);
    }
  }

  let ch: number;
  $: ch = placementHeight / 2;

  let lineWidth: number;
  $: lineWidth = Math.abs(offset) * placementWidth + 10;

  let lineLeft: number;
  $: lineLeft = Math.min(offset, 0) * placementWidth - 5;

  let node: HTMLDivElement | undefined;
  function focusNode() {
    if (node) node.focus();
  }
  function unfocusNode() {
    if ($contextModalStore === null) treeContainer.focus();
  }

  function keyPressed(event: KeyboardEvent) {
    // if (event.key === "r") return loadMore();
    if (event.key === "d") return state.remove();
  }

  let pendingLoad: Readable<number>;
  $: pendingLoad = state.pendingChildren;
</script>

<style>
  .thumbnail {
    grid-column: 1;
    grid-row: 1;

    max-height: 100%;
    max-width: 100%;
    border-radius: 20%;
  }

  .label {
    font-size: 30px;
    grid-column: 1;
    grid-row: 1;
    text-align: center;
    color: var(--text)
  }

  .pendingLoad {
    font-size: 18px;
    text-align: center;
    margin: 8px 0 0 0;
    border-radius: 30%;
    width: fit-content;
    color: var(--textDark);
    background-color: var(--bgDark);
    border: 2px solid var(--border);

    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    z-index: 999;
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
    justify-content: center;
    align-items: center;

    margin-left: -32px;
    width: 64px;
    height: 64px;

    cursor: pointer;
    outline: none;

    transition-timing-function: ease-in-out;
    transition-property: transform, background-color, opacity, left;

  }

  .placement:hover {
    transform: scale(1.1, 1.1);
    transform-origin: center;
  }

  .anchor {
    position: absolute;
  }
</style>

<div
  class="anchor"
  style={`top: ${placementHeight}px; left: ${placementWidth * offset}px; transition-duration: ${placementTransitionMs}ms;`}
>
  <div
    class="placement"
    style={`transition-duration: ${placementTransitionMs}ms;`}
    bind:this={node}
    on:mousedown={leftClick}
    on:contextmenu|preventDefault={rightClick}
    on:mouseenter={focusNode}
    on:mouseleave={unfocusNode}
    on:keypress={keyPressed}
    tabindex={0}
  >
    <!-- svelte-ignore a11y-missing-attribute -->
    <img
      src={thumbnailUrl($saveNameStore, state)}
      class="thumbnail"
      transition:scale={{delay: placementTransitionMs * 0.75, duration: placementTransitionMs * 0.25}}
    >
    <!-- <span class="label">{leafCount}</span> -->
    {#if $pendingLoad > 0}
      <p class="pendingLoad">
        +{$pendingLoad}
      </p>
    {/if}
  </div>
  {#each children as child, idx (child.id)}
    <svelte:self
      state={child}
      depth={depth + 1}
      offset={childrenOffsets[idx]}
      parentOffset={offset}
      bind:leafCount={childrenLeafCounts[idx]}
      {treeContainer}
    />
  {/each}
</div>
<svg
  class="line"
  width={lineWidth}
  height={ch * 2 + 2}
  style={`left: ${lineLeft}px; top: ${24}px; transform: scaleX(${offset < 0 ? -1 : 1}); z-index: ${edgeZ}; transition-duration: ${placementTransitionMs}ms;`}
>
  {#if cwTweened !== undefined}
    <path
      class="path"
      d={`m 5 0 c 0 ${ch + 0.5} ${$cwTweened * 2} ${ch + 0.5} ${$cwTweened * 2} ${ch * 2 + 1}`}
      stroke={edgeColor}
      stroke-width="4px"
      fill="none"
      transition:draw={{duration: placementTransitionMs}}
    />
  {/if}
</svg>