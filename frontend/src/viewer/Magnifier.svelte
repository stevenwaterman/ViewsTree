<script lang="ts">
  import { generationSettingsStore } from "../state/settings";

  let element: HTMLDivElement;

  let width: number;
  $: width = $generationSettingsStore.width

  let height: number;
  $: height = $generationSettingsStore.height;

  let zoomLevel: number = 2;
  let mouseX: number = 0.5;
  let mouseY: number = 0.5;
  let enableZoom: boolean = false;

  let marginFraction: number;
  $: marginFraction = (0.5 / zoomLevel);

  let zoomX: number;
  $: zoomX = mouseX * (1 - marginFraction * 2) + marginFraction;

  let zoomY: number;
  $: zoomY = mouseY * (1 - marginFraction * 2) + marginFraction;

  function onMouseMove(event: MouseEvent) {
    const box = element.getBoundingClientRect();
    mouseX = (event.clientX - box.left) / width;
    mouseY = (event.clientY - box.top) / height;
  }

  function onMouseEnter(event: MouseEvent) {
    enableZoom = true;
  }

  function onMouseLeave(event: MouseEvent) {
    enableZoom = false;
  }

  function onScroll(event: WheelEvent) {
    const zoomMultiplier = Math.pow(1.002, -event.deltaY);
    const newZoomLevel = zoomLevel * zoomMultiplier;
    zoomLevel = Math.min(Math.max(newZoomLevel, 1), 10);
  }

  let style: string;
  $: style = `transform: scale(${zoomLevel}) translateX(${50 - zoomX * 100}%) translateY(${50 - zoomY * 100}%);`;
</script>

<style>
  .magnifier {
    overflow: hidden;
  }

  .inner {

  }
</style>

<div
  class="magnifier"
  bind:this={element}
  on:mousemove={onMouseMove}
  on:mouseenter={onMouseEnter}
  on:mouseleave={onMouseLeave}
  on:wheel={onScroll}
>
  <div class="inner" style={enableZoom ? style : ""}>
    <slot/>
  </div>
</div>

