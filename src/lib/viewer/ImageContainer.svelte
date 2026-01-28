<script lang="ts">
  import { imageUrl } from "../generator/comfyGenerator";
  import Magnifier from "./Magnifier.svelte";
  import { selectedStore } from "../state/selected";
  import { generationSettingsStore } from "../state/settings";
  import type { AnyNode } from "../state/nodeTypes/nodes";
  import { saveStore } from "../persistence/saves";

  let selected: AnyNode;
  $: selected = $selectedStore;

  $: aspect = $generationSettingsStore.width / $generationSettingsStore.height || 1;
  $: style = `aspect-ratio: ${aspect}; width: 100%; height: 100%; max-width: 100%; max-height: 100%;`;
</script>

<Magnifier>
  <div class="imageContainer" style={style}>
    {#if selected.isBranch}
      {#if selected.type === "Mask"}
        <!-- svelte-ignore a11y-missing-attribute -->
        <img
          class="child image"
          style={`mask-image: url(${imageUrl(
            $saveStore,
            selected
          )}); mask-mode: luminance; mask-size: 100% 100%; mask-repeat: no-repeat;`}
          src={imageUrl($saveStore, selected.parent)}
        />
      {:else}
        <!-- svelte-ignore a11y-missing-attribute -->
        <img class="child image" src={imageUrl($saveStore, selected)} />
      {/if}
    {/if}

    <div class="background image" />
  </div>
</Magnifier>

<style>
  .imageContainer {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .image {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .background {
    z-index: -1;
    background: repeating-conic-gradient(
        var(--border) 0% 25%,
        var(--bgDark) 0% 50%
      )
      50% / 32px 32px;
  }

  .child {
    z-index: 1;
  }

  .parent {
    z-index: 2;
  }

  .difference {
    mix-blend-mode: difference;
  }

  .mask {
    mix-blend-mode: multiply;
  }
</style>
