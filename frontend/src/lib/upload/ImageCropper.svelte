<script lang="ts">
  import Cropper from "./Cropper.svelte";
  import { generationSettingsStore, saveNameStore } from "../state/settings";
  import { queueGeneration, queueUpload } from "../generator/generator";
  import { modalComponent } from "../modalStore";

  export let image: string;

  let cropSize: { width: number; height: number };
  $: cropSize = {
    width: $generationSettingsStore.width,
    height: $generationSettingsStore.height,
  };

  let aspect: number;
  $: aspect = cropSize.width / cropSize.height;

  let crop:
    | { top: number; right: number; bottom: number; left: number }
    | undefined = undefined;

  function updateCrop(
    event: CustomEvent<{
      pixels: {
        x: number;
        y: number;
        width: number;
        height: number;
      };
    }>
  ) {
    const { x, y, width, height } = event.detail.pixels;
    crop = {
      top: y,
      right: x + width,
      bottom: y + height,
      left: x,
    };
  }

  async function submit(): Promise<void> {
    if (crop === undefined) return;
    const upload = queueUpload($saveNameStore, { image, crop, ...cropSize });
    modalComponent.close();
    return upload;
  }
</script>

<div class="container">
  <Cropper
    {image}
    {cropSize}
    {aspect}
    minZoom={0}
    maxZoom={100}
    restrictPosition
    crop={{ x: 0, y: 0 }}
    zoom={1}
    on:cropcomplete={updateCrop}
  />
</div>
<button on:click={submit} disabled={crop === undefined}>Submit</button>

<style>
  .container {
    height: calc(100vh - 10em);
    position: relative;
  }
</style>
