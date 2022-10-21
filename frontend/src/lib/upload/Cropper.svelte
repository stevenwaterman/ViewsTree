<script lang="ts">
  // Taken from https://github.com/ValentinH/svelte-easy-crop/blob/master/src/index.svelte to fix the zooming

  import { onMount, onDestroy, createEventDispatcher } from "svelte";

  type Position = { x: number; y: number };
  type Size = { width: number; height: number };

  /**
   * Compute the dimension of the crop area based on image size and aspect ratio
   * @param {number} imgWidth width of the src image in pixels
   * @param {number} imgHeight height of the src image in pixels
   * @param {number} aspect aspect ratio of the crop
   */
  export function getCropSize(
    imgWidth: number,
    imgHeight: number,
    aspect: number
  ) {
    if (imgWidth >= imgHeight * aspect) {
      return {
        width: imgHeight * aspect,
        height: imgHeight,
      };
    }
    return {
      width: imgWidth,
      height: imgWidth / aspect,
    };
  }

  /**
   * Ensure a new image position stays in the crop area.
   * @param {Position} position new x/y position requested for the image
   * @param {Size} imageSize width/height of the src image
   * @param {Size} cropSize width/height of the crop area
   * @param {number} zoom zoom value
   * @returns {Position}
   */
  export function clampPosition(
    position: Position,
    imageSize: Size,
    cropSize: Size,
    zoom: number
  ): Position {
    return {
      x: clampPositionCoord(position.x, imageSize.width, cropSize.width, zoom),
      y: clampPositionCoord(
        position.y,
        imageSize.height,
        cropSize.height,
        zoom
      ),
    };
  }

  function clampPositionCoord(position, imageSize, cropSize, zoom) {
    const maxPosition = (imageSize * zoom) / 2 - cropSize / 2;
    return Math.min(maxPosition, Math.max(position, -maxPosition));
  }

  export function getDistanceBetweenPoints(pointA, pointB) {
    return Math.sqrt(
      Math.pow(pointA.y - pointB.y, 2) + Math.pow(pointA.x - pointB.x, 2)
    );
  }

  /**
   * Compute the output cropped area of the image in percentages and pixels.
   * x/y are the top-left coordinates on the src image
   * @param {Position} crop x/y position of the current center of the image
   * @param {{width: number, height: number, naturalWidth: number, naturelHeight: number}} imageSize width/height of the src image (default is size on the screen, natural is the original size)
   * @param {Size} cropSize width/height of the crop area
   * @param {number} aspect aspect value
   * @param {number} zoom zoom value
   * @param {boolean} restrictPosition whether we should limit or not the cropped area
   */
  export function computeCroppedArea(
    crop: Position,
    imgSize: Size & { naturalWidth: number; naturalHeight: number },
    cropSize: Size,
    aspect: number,
    zoom: number,
    restrictPosition: boolean = true
  ) {
    const limitAreaFn = restrictPosition ? limitArea : noOp;
    const croppedAreaPercentages = {
      x: limitAreaFn(
        100,
        (((imgSize.width - cropSize.width / zoom) / 2 - crop.x / zoom) /
          imgSize.width) *
          100
      ),
      y: limitAreaFn(
        100,
        (((imgSize.height - cropSize.height / zoom) / 2 - crop.y / zoom) /
          imgSize.height) *
          100
      ),
      width: limitAreaFn(100, ((cropSize.width / imgSize.width) * 100) / zoom),
      height: limitAreaFn(
        100,
        ((cropSize.height / imgSize.height) * 100) / zoom
      ),
    };

    // we compute the pixels size naively
    const widthInPixels = limitAreaFn(
      imgSize.naturalWidth,
      (croppedAreaPercentages.width * imgSize.naturalWidth) / 100,
      true
    );
    const heightInPixels = limitAreaFn(
      imgSize.naturalHeight,
      (croppedAreaPercentages.height * imgSize.naturalHeight) / 100,
      true
    );
    const isImgWiderThanHigh =
      imgSize.naturalWidth >= imgSize.naturalHeight * aspect;

    // then we ensure the width and height exactly match the aspect (to avoid rounding approximations)
    // if the image is wider than high, when zoom is 0, the crop height will be equals to iamge height
    // thus we want to compute the width from the height and aspect for accuracy.
    // Otherwise, we compute the height from width and aspect.
    const sizePixels = isImgWiderThanHigh
      ? {
          width: Math.round(heightInPixels * aspect),
          height: heightInPixels,
        }
      : {
          width: widthInPixels,
          height: Math.round(widthInPixels / aspect),
        };
    const croppedAreaPixels = {
      ...sizePixels,
      x: limitAreaFn(
        imgSize.naturalWidth - sizePixels.width,
        (croppedAreaPercentages.x * imgSize.naturalWidth) / 100,
        true
      ),
      y: limitAreaFn(
        imgSize.naturalHeight - sizePixels.height,
        (croppedAreaPercentages.y * imgSize.naturalHeight) / 100,
        true
      ),
    };
    return { croppedAreaPercentages, croppedAreaPixels };
  }

  /**
   * Ensure the returned value is between 0 and max
   * @param {number} max
   * @param {number} value
   * @param {boolean} shouldRound
   */
  function limitArea(max, value, shouldRound = false) {
    const v = shouldRound ? Math.round(value) : value;
    return Math.min(max, Math.max(0, v));
  }

  function noOp(max, value) {
    return value;
  }

  /**
   * Return the point that is the center of point a and b
   * @param {Position} a
   * @param {Position} b
   */
  export function getCenter(a: Position, b: Position): Position {
    return {
      x: (b.x + a.x) / 2,
      y: (b.y + a.y) / 2,
    };
  }

  /**
   * Return the point that is the center of point a and b
   * @param {DOMRect} rect
   */
  export function getDomRectCenter(rect: DOMRect): Position {
    return {
      x: (rect.left + rect.right) / 2,
      y: (rect.top + rect.bottom) / 2,
    };
  }

  export let image: string;
  export let crop: Position = { x: 0, y: 0 };
  export let zoom: number = 1;
  export let aspect: number = 4 / 3;
  export let minZoom: number = 1;
  export let maxZoom: number = 3;
  export let cropSize: Size | null = null;
  export let cropShape: "rect" | "round" = "rect";
  export let showGrid: boolean = true;
  export let zoomSpeed: number = 1;
  export let crossOrigin: string | null = null;
  export let restrictPosition: boolean = true;

  let cropperSize: Size | null = null;
  let imageSize: Size & { naturalWidth: number; naturalHeight: number } = {
    width: 0,
    height: 0,
    naturalWidth: 0,
    naturalHeight: 0,
  };
  let containerEl: HTMLDivElement | null = null;
  let containerRect: DOMRect | null = null;
  let imgEl: HTMLImageElement | null = null;
  let dragStartPosition: Position = { x: 0, y: 0 };
  let dragStartCrop: Position = { x: 0, y: 0 };
  let lastPinchDistance: number = 0;
  let rafDragTimeout: number | null = null;
  let rafZoomTimeout: number | null = null;

  const dispatch = createEventDispatcher();

  onMount(() => {
    // when rendered via SSR, the image can already be loaded and its onLoad callback will never be called
    if (imgEl && imgEl.complete) {
      onImgLoad();
    }
  });

  onDestroy(() => {
    cleanEvents();
  });

  const cleanEvents = () => {
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onDragStopped);
    document.removeEventListener("touchmove", onTouchMove);
    document.removeEventListener("touchend", onDragStopped);
  };

  const onImgLoad = () => {
    computeSizes();
    emitCropData();
  };

  const getAspect = () => {
    if (cropSize) {
      return cropSize.width / cropSize.height;
    }
    return aspect;
  };

  const computeSizes = () => {
    if (imgEl) {
      imageSize = {
        width: imgEl.width,
        height: imgEl.height,
        naturalWidth: imgEl.naturalWidth,
        naturalHeight: imgEl.naturalHeight,
      };
    }

    if (containerEl) {
      containerRect = containerEl.getBoundingClientRect();
      cropperSize = getCropSize(
        containerRect.width,
        containerRect.height,
        aspect
      );
    }

    if (imgEl && containerEl) {
      setNewZoom(zoom, getDomRectCenter(containerRect as DOMRect));
    }
  };

  const getMousePoint = (e) => ({ x: Number(e.clientX), y: Number(e.clientY) });

  const getTouchPoint = (touch) => ({
    x: Number(touch.clientX),
    y: Number(touch.clientY),
  });

  const onMouseDown = (e) => {
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onDragStopped);
    onDragStart(getMousePoint(e));
  };

  const onMouseMove = (e) => onDrag(getMousePoint(e));

  const onTouchStart = (e) => {
    document.addEventListener("touchmove", onTouchMove, { passive: false }); // iOS 11 now defaults to passive: true
    document.addEventListener("touchend", onDragStopped);

    if (e.touches.length === 2) {
      onPinchStart(e);
    } else if (e.touches.length === 1) {
      onDragStart(getTouchPoint(e.touches[0]));
    }
  };

  const onTouchMove = (e) => {
    // Prevent whole page from scrolling on iOS.
    e.preventDefault();
    if (e.touches.length === 2) {
      onPinchMove(e);
    } else if (e.touches.length === 1) {
      onDrag(getTouchPoint(e.touches[0]));
    }
  };

  const onDragStart = ({ x, y }) => {
    dragStartPosition = { x, y };
    dragStartCrop = { x: crop.x, y: crop.y };
  };

  const onDrag = ({ x, y }) => {
    if (rafDragTimeout) window.cancelAnimationFrame(rafDragTimeout);

    rafDragTimeout = window.requestAnimationFrame(() => {
      if (x === undefined || y === undefined) return;
      const offsetX = x - dragStartPosition.x;
      const offsetY = y - dragStartPosition.y;
      const requestedPosition = {
        x: dragStartCrop.x + offsetX,
        y: dragStartCrop.y + offsetY,
      };

      crop = restrictPosition
        ? clampPosition(
            requestedPosition,
            imageSize,
            cropperSize ?? { width: 0, height: 0 },
            zoom
          )
        : requestedPosition;
    });
  };

  const onDragStopped = () => {
    cleanEvents();
    emitCropData();
  };

  const onPinchStart = (e) => {
    const pointA = getTouchPoint(e.touches[0]);
    const pointB = getTouchPoint(e.touches[1]);
    lastPinchDistance = getDistanceBetweenPoints(pointA, pointB);
    onDragStart(getCenter(pointA, pointB));
  };

  const onPinchMove = (e) => {
    const pointA = getTouchPoint(e.touches[0]);
    const pointB = getTouchPoint(e.touches[1]);
    const center = getCenter(pointA, pointB);
    onDrag(center);

    if (rafZoomTimeout) window.cancelAnimationFrame(rafZoomTimeout);
    rafZoomTimeout = window.requestAnimationFrame(() => {
      const distance = getDistanceBetweenPoints(pointA, pointB);
      const newZoom = zoom * (distance / lastPinchDistance);
      setNewZoom(newZoom, center);
      lastPinchDistance = distance;
    });
  };

  const onWheel = (e) => {
    const point = getMousePoint(e);
    const newZoom = zoom * Math.pow(1.002, -e.deltaY * zoomSpeed);
    setNewZoom(newZoom, point);
  };

  const getPointOnContainer = ({ x, y }) => {
    if (!containerRect) {
      throw new Error("The Cropper is not mounted");
    }
    return {
      x: containerRect.width / 2 - (x - containerRect.left),
      y: containerRect.height / 2 - (y - containerRect.top),
    };
  };

  const getPointOnImage = ({ x, y }) => ({
    x: (x + crop.x) / zoom,
    y: (y + crop.y) / zoom,
  });

  const setNewZoom = (newZoom, point) => {
    const zoomPoint = getPointOnContainer(point);
    const zoomTarget = getPointOnImage(zoomPoint);
    const requestedZoom = Math.min(maxZoom, Math.max(newZoom, minZoom));
    const cropSize = cropperSize ?? { width: 0, height: 0 };

    if (restrictPosition) {
      const minZoomWidth = cropSize.width / imageSize.width;
      const minZoomHeight = cropSize.height / imageSize.height;
      const clampMinZoom = Math.max(minZoomWidth, minZoomHeight);
      zoom = Math.max(clampMinZoom, requestedZoom);
    } else {
      zoom = requestedZoom;
    }

    const requestedPosition = {
      x: zoomTarget.x * zoom - zoomPoint.x,
      y: zoomTarget.y * zoom - zoomPoint.y,
    };
    crop = restrictPosition
      ? clampPosition(requestedPosition, imageSize, cropSize, zoom)
      : requestedPosition;
  };

  const emitCropData = () => {
    if (!cropperSize || cropperSize.width === 0) return;
    // this is to ensure the crop is correctly restricted after a zoom back (https://github.com/ricardo-ch/svelte-easy-crop/issues/6)
    const position = restrictPosition
      ? clampPosition(
          crop,
          imageSize,
          cropperSize ?? { width: 0, height: 0 },
          zoom
        )
      : crop;
    const { croppedAreaPercentages, croppedAreaPixels } = computeCroppedArea(
      position,
      imageSize,
      cropperSize,
      getAspect(),
      zoom,
      restrictPosition
    );

    dispatch("cropcomplete", {
      percent: croppedAreaPercentages,
      pixels: croppedAreaPixels,
    });
  };

  // ------ Reactive statement ------
  //when aspect changes, we reset the cropperSize
  $: if (imgEl) {
    cropperSize = cropSize
      ? cropSize
      : getCropSize(imgEl.width, imgEl.height, aspect);
  }

  // when zoom changes, we recompute the cropped area
  $: zoom && emitCropData();
</script>

<svelte:window on:resize={computeSizes} />
<div
  class="container"
  bind:this={containerEl}
  on:mousedown|preventDefault={onMouseDown}
  on:touchstart|preventDefault={onTouchStart}
  on:wheel|preventDefault={onWheel}
>
  <img
    bind:this={imgEl}
    class="image"
    src={image}
    on:load={onImgLoad}
    alt=""
    style="transform: translate({crop.x}px, {crop.y}px) scale({zoom});"
    crossorigin={crossOrigin}
  />
  {#if cropperSize}
    <div
      class="cropperArea"
      class:round={cropShape === "round"}
      class:grid={showGrid}
      style="width: {cropperSize.width}px; height: {cropperSize.height}px;"
      data-testid="cropper"
    />
  {/if}
</div>

<style>
  .container {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    overflow: hidden;
    user-select: none;
    touch-action: none;
    cursor: move;
  }

  .image {
    max-width: 100%;
    max-height: 100%;
    margin: auto;
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    will-change: transform;
  }

  .cropperArea {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    box-shadow: 0 0 0 9999em;
    box-sizing: border-box;
    color: rgba(0, 0, 0, 0.5);
    border: 1px solid rgba(255, 255, 255, 0.5);
    overflow: hidden;
  }

  .grid:before {
    content: " ";
    box-sizing: border-box;
    border: 1px solid rgba(255, 255, 255, 0.5);
    position: absolute;
    top: 0;
    bottom: 0;
    left: 33.33%;
    right: 33.33%;
    border-top: 0;
    border-bottom: 0;
  }

  .grid:after {
    content: " ";
    box-sizing: border-box;
    border: 1px solid rgba(255, 255, 255, 0.5);
    position: absolute;
    top: 33.33%;
    bottom: 33.33%;
    left: 0;
    right: 0;
    border-left: 0;
    border-right: 0;
  }

  .round {
    border-radius: 50%;
  }
</style>
