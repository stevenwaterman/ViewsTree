<script lang="ts">
  import { onMount } from "svelte";
  import { imageUrl, queueMask } from "../generator/generator";
  import { modalComponent } from "../modalStore";
  import { saveStore } from "../persistence/saves";
  import type { BranchNode } from "../state/nodeTypes/nodes";
  import { selectedStore } from "../state/selected";
  import { generationSettingsStore } from "../state/settings";

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;

  let cursorX: number = 0;
  let cursorY: number = 0;

  onMount(() => {
    ctx = canvas.getContext("2d")!;
    fill("keep");
  });

  let brushSize: number = 50;

  function mouseMove(event: MouseEvent) {
    if (!ctx || !canvas) return;

    const boundingBox = canvas.getBoundingClientRect();
    cursorX = event.clientX - boundingBox.x;
    cursorY = event.clientY - boundingBox.y;

    if (event.buttons === 1) {
      paint("regen");
    } else if (event.buttons === 2) {
      paint("keep");
    }
  }

  function paint(operation: "keep" | "regen") {
    if (operation === "keep") ctx.fillStyle = "white";
    else ctx.fillStyle = "black";
    ctx.fillRect(
      Math.round(cursorX - brushSize / 2),
      Math.round(cursorY - brushSize / 2),
      Math.round(brushSize),
      Math.round(brushSize)
    );
  }

  function fill(operation: "keep" | "regen") {
    if (operation === "keep") ctx.fillStyle = "white";
    else ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function wheel(event: WheelEvent) {
    brushSize = brushSize * Math.pow(1.002, event.deltaY);
  }

  async function submit(): Promise<void> {
    const mask = queueMask(
      $saveStore,
      {
        image: canvas.toDataURL()!,
        width: canvas.width,
        height: canvas.height,
      },
      $selectedStore as BranchNode
    );
    modalComponent.close();
    return mask;
  }
</script>

<div class="container">
  {#if $selectedStore.isBranch}
    <div
      class="cursor"
      style={`left: ${cursorX}px; top: ${cursorY}px; width: ${brushSize}px; height: ${brushSize}px;`}
    />
    <canvas
      bind:this={canvas}
      width={$generationSettingsStore.width}
      height={$generationSettingsStore.height}
      on:mousemove={mouseMove}
      on:wheel={wheel}
      on:mousedown={() => paint("regen")}
    />
    <!-- svelte-ignore a11y-missing-attribute -->
    <img src={imageUrl($saveStore, $selectedStore)} />
  {/if}
</div>

<div class="row">
  <button style="background-color: black" on:click={() => fill("regen")} />
  <button style="background-color: white" on:click={() => fill("keep")} />
  <button style="width: auto" on:click={submit}>Submit</button>
</div>

<style>
  .container {
    position: relative;
    overflow: hidden;
  }

  canvas {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 1;
    opacity: 0.75;
    mix-blend-mode: multiply;
  }

  .cursor {
    position: absolute;
    z-index: 2;
    border: 1px solid red;
    pointer-events: none;
    transform: translate(-50%, -50%);
  }

  button {
    height: 3em;
    width: 3em;
    margin: 0.5em;
  }

  .row {
    display: flex;
    flex-direction: row;
  }
</style>
