<script lang="ts">
  import toCss from "react-style-object-to-css";
  import colorLookup from "../colors";
  import { generateBranch } from "../lib/generator";
  import { saveNameStore } from "../state/settings";
  import { selectedPathStore, selectedStore, type NodeState } from "../state/tree";
  import { getContext } from "svelte";
  import { contextModalStore } from "./ContextModalStore";

  export let state: NodeState;
  export let treeContainer: HTMLDivElement;

  // let pendingLoad: number;
  // $: pendingLoad = branchState.pendingLoad;

  function leftClick(event: MouseEvent) {
    if (event.button === 0) selectedStore.set(state);
  }

  function rightClick({ clientX, clientY }: MouseEvent) {
    contextModalStore.set({
      coordinates: [clientX, clientY],
      state
    });
  }

  let selected: boolean;
  $: selected = $selectedStore?.id === state.id;

  let nodeColor: string;
  $: nodeColor = selected ? colorLookup.nodePlaying : colorLookup.nodeInactive;

  let onSelectedPath: boolean;
  $: onSelectedPath = $selectedPathStore.includes(state.id);

  let edgeColor: string;
  $: edgeColor = onSelectedPath ? colorLookup.edgePlaying : colorLookup.edgeInactive;

  let edgeZ: number;
  $: edgeZ = onSelectedPath ? 1 : 0;

  // let numberOfLeavesStore: Readable<number>;
  // $: numberOfLeavesStore = branchStore.numberOfLeavesStore;

  let depth: number = 0;
  let offset: number = 0;
  let parentOffset: number = 0;
  let numberOfLeaves: number = 0;
  // $: numberOfLeaves = $numberOfLeavesStore;

  let placementOffset: number;
  $: placementOffset = offset + -numberOfLeaves / 2;

  // let placementStore: Readable<Array<[number, number]>>;
  // $: placementStore = branchStore.placementStore;

  // let childPlacements: Array<[number, number]>;
  // $: childPlacements = $placementStore;

  let offsetWidth: number;
  $: offsetWidth = Math.abs(parentOffset - offset);

  let cw: number;
  $: cw = offsetWidth * 30;

  let ch: number;
  $: ch = 150 / 2;

  let lineWidth: number;
  $: lineWidth = offsetWidth * 60 + 10;

  let lineLeft: number;
  $: lineLeft = Math.min(offset, parentOffset) * 60 - 5;

  let node: HTMLDivElement | undefined;
  function focusNode() {
    if (node) node.focus();
  }
  function unfocusNode() {
    if ($contextModalStore === null) treeContainer.focus();
  }

  const { open } = getContext<any>("simple-modal");

  function loadMore() {
    return generateBranch($saveNameStore, state, { prompt: "hi" });
  }

  function keyPressed(event: KeyboardEvent) {
    if (event.key === "r") return loadMore();
    if (event.key === "d") return state.remove();
  }

  let pathStyle: JSX.CSSProperties;
  $: pathStyle = toCss({ cursor: onSelectedPath ? 'pointer' : 'initial' }) as any;

  let lineStyle: JSX.CSSProperties;
  $: lineStyle = toCss({ left: lineLeft, top: (depth - 1) * ch * 2 + 24, transform: `scaleX(${offset < parentOffset ? -1 : 1})`, zIndex: edgeZ }) as any;
</script>

<style>
  .node {
    display: flex;
    justify-content: center;
    align-items: center;

    width: 50px;
    height: 50px;
    border-radius: 50%;

    cursor: pointer;
    outline: none;
    transition: transform 0.2s ease-in-out, background-color 0.2s ease-in-out,
      opacity 0.2s ease-in-out;
  }

  .node:hover {
    transform: scale(1.1, 1.1);
    transform-origin: center;
  }

  .label {
    font-size: 30px;
  }

  .pendingLoad {
    font-size: 18px;
    text-align: center;
    margin: 8px 0 0 0;
    border-radius: 30%;
    width: 100%;
  }

  .line {
    position: absolute;
  }

  .placement {
    position: absolute;
    z-index: 2;
  }

  path {
    transition: stroke 0.2s ease-in-out;
  }
</style>

<div
  class="placement"
  style={toCss({top: 150 * depth, left: 60 * offset - 25})}>
  <div
    on:mousedown={leftClick}
    on:contextmenu|preventDefault={rightClick}
    on:mouseenter={focusNode}
    on:mouseleave={unfocusNode}
    on:keypress={keyPressed}
    bind:this={node}
    class="node"
    style={toCss({backgroundColor: nodeColor})}
    tabindex={0}>
    <!-- <span class="label">{childIndex}</span> -->
  </div>
  <!-- {#if pendingLoad > 0} -->
    <!-- <p -->
      <!-- class="pendingLoad" -->
      <!-- style={toCss({color: colorLookup.textDark, backgroundColor: colorLookup.bgLight, border: "2px solid", borderColor: colorLookup.border})}> -->
      <!-- +{pendingLoad} -->
    <!-- </p> -->
  <!-- {/if} -->
</div>
<!-- {#if childPlacements.length > 0} -->
<!-- {#each childPlacements as [idx, placement] (idx)}
  <svelte:self
    parentStore={branchStore}
    branchStore={childStores[idx]}
    depth={depth + 1}
    offset={placementOffset + placement}
    parentOffset={offset}
    {treeContainer} />
{/each} -->
<!-- {/if} -->
<svg
  class="line"
  width={lineWidth}
  height={ch * 2 + 2}
  style={lineStyle}>
  <path
    d={`m 5 0 c 0 ${ch + 0.5} ${cw * 2} ${ch + 0.5} ${cw * 2} ${ch * 2 + 1}`}
    stroke={`url(#linear${depth},${offset})`}
    stroke-width="6px"
    fill="none"
    style={pathStyle}
  />
</svg>
