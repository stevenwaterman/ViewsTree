<script lang="ts">
  import { generateBranch, thumbnailUrl } from "../lib/generator";
  import { saveNameStore } from "../state/settings";
  import { selectedPathStore, selectedStore, type NodeState } from "../state/tree";
  import { contextModalStore } from "./ContextModalStore";

  export let state: NodeState;
  export let treeContainer: HTMLDivElement;

  export let depth: number;
  export let offset: number;
  export let parentOffset: number;

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

  let onSelectedPath: boolean;
  $: onSelectedPath = $selectedPathStore.includes(state.id);

  let edgeColor: string;
  $: edgeColor = onSelectedPath ? "var(--edgePlaying)" : "var(--edgeInactive)";

  let edgeZ: number;
  $: edgeZ = onSelectedPath ? 1 : 0;

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

  function loadMore() {
    return generateBranch($saveNameStore, state, { prompt: "hi" });
  }

  function keyPressed(event: KeyboardEvent) {
    if (event.key === "r") return loadMore();
    if (event.key === "d") return state.remove();
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
  style={`top: ${150 * depth}px; left: ${60 * offset - 25}px`}>
  <!-- svelte-ignore a11y-missing-attribute -->
  <img
    on:mousedown={leftClick}
    on:contextmenu|preventDefault={rightClick}
    on:mouseenter={focusNode}
    on:mouseleave={unfocusNode}
    on:keypress={keyPressed}
    bind:this={node}
    src={thumbnailUrl($saveNameStore, state)}
    class="node"
    tabindex={0}/>
  <!-- {#if pendingLoad > 0} -->
    <!-- <p -->
      <!-- class="pendingLoad" -->
      <!-- style={toCss({color: colorLookup.textDark, backgroundColor: colorLookup.bgLight, border: "2px solid", borderColor: colorLookup.border})}> -->
      <!-- +{pendingLoad} -->
    <!-- </p> -->
  <!-- {/if} -->
</div>
{#each Object.values(state.children) as child, idx (child.id)}
  <svelte:self
    state={child}
    depth={depth + 1}
    offset={idx}
    parentOffset={offset}
    {treeContainer}
  />
{/each}
<svg
  class="line"
  width={lineWidth}
  height={ch * 2 + 2}
  style={`left: ${lineLeft}px; top: ${(depth - 1) * ch * 2 + 24}px; transform: scaleX(${offset < parentOffset ? -1 : 1}); z-index: ${edgeZ};`}
>
  <path
    d={`m 5 0 c 0 ${ch + 0.5} ${cw * 2} ${ch + 0.5} ${cw * 2} ${ch * 2 + 1}`}
    stroke={edgeColor}
    stroke-width="6px"
    fill="none"
  />
</svg>
