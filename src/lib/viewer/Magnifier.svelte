<script lang="ts">
  let element: HTMLDivElement;

  let zoomLevel: number = 2;
  let mouseX: number = 0.5;
  let mouseY: number = 0.5;
  let enableZoom: boolean = false;

  let marginFraction: number;
  $: marginFraction = 0.5 / zoomLevel;

  let zoomX: number;
  $: zoomX = mouseX * (1 - marginFraction * 2) + marginFraction;

  let zoomY: number;
  $: zoomY = mouseY * (1 - marginFraction * 2) + marginFraction;

  function onMouseMove(event: MouseEvent) {
    const box = element.getBoundingClientRect();
    mouseX = (event.clientX - box.left) / box.width;
    mouseY = (event.clientY - box.top) / box.height;
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
  $: style = `transform: scale(${zoomLevel}) translateX(${
    50 - zoomX * 100
  }%) translateY(${50 - zoomY * 100}%);`;
</script>

<!-- svelte-ignore a11y-mouse-events-have-key-events -->
<div
  class="magnifier"
  bind:this={element}
  on:mousemove={onMouseMove}
  on:mouseenter={onMouseEnter}
  on:mouseleave={onMouseLeave}
  on:wheel={onScroll}
>
  <div class="inner" style={enableZoom ? style : ""}>
    <slot />
  </div>
</div>

<style>
  .magnifier {
    overflow: hidden;
    width: 100%;
    height: 100%;
  }

  .inner {
    width: 100%;
    height: 100%;
  }
</style>