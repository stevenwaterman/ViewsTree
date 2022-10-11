<script lang="ts">
  import type { Readable, Writable } from "svelte/store";
  import { generate, thumbnailUrl } from "../generator/generator";
  import { contextModalStore } from "./ContextModalStore";
  import { getPlacements, nodeWidth, placementHeight, placementTransitionMs, placementWidth } from "./placement";
  import { draw, scale } from "svelte/transition";
  import { tweened } from "svelte/motion";
  import { sineInOut } from "svelte/easing";
  import type { BranchState, NodeState } from "../state/tree";
    import { selectedPathStore, selectedStore } from "../state/selected";
    import { generationSettingsStore, saveNameStore } from "../state/settings";

  export let state: NodeState;
  export let treeContainer: HTMLDivElement;

  export let depth: number;
  export let offset: number;

  function leftClick(event: MouseEvent) {
    if (event.button === 0) {
      if (event.shiftKey) generationSettingsStore.copySettings(state);
      else if (event.ctrlKey) generationSettingsStore.copySeed(state);
      else selectedStore.set(state);
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
  $: children = $childrenStore ?? [];

  let childLeafCountStore: Readable<number[]>;
  $: childLeafCountStore = state.childLeafCountStore;

  let leafCountStore: Readable<number>;
  $: leafCountStore = state.leafCountStore;

  let childrenOffsets: number[];
  $: childrenOffsets = getPlacements($childLeafCountStore);

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
  $: if (selected) focusNode();

  function keyPressed(event: KeyboardEvent) {
    if (event.key === "d") return state.remove();
    else if (event.key === "r") return generate($saveNameStore, $generationSettingsStore, state);
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
      class:selected
      transition:scale={{delay: placementTransitionMs * 0.75, duration: placementTransitionMs * 0.25}}
    >
    <!-- <span class="label">{JSON.stringify($leafCountStore)}</span> -->
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