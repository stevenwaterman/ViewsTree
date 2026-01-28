<script lang="ts">
  import { imageUrl } from "../generator/comfyGenerator";
  import Magnifier from "./Magnifier.svelte";
  import { selectedStore } from "../state/selected";
  import { generationSettingsStore } from "../state/settings";
  import type { AnyNode } from "../state/nodeTypes/nodes";
  import { saveStore } from "../persistence/saves";

  let selected: AnyNode;
  $: selected = $selectedStore;

  let style: string;
  $: style = `width: ${$generationSettingsStore.width}px; height: ${$generationSettingsStore.height}px;`;
</script>

<Magnifier>
  <div class="imageContainer" {style}>
    {#if selected.isBranch}
      {#if selected.type === "Mask"}
        <!-- svelte-ignore a11y-missing-attribute -->
        <img
          class="child image"
          style={`${style}; mask-image: url(${imageUrl(
            $saveStore,
            selected
          )}); mask-mode: luminance;`}
          src={imageUrl($saveStore, selected.parent)}
        />
      {:else}
        <!-- svelte-ignore a11y-missing-attribute -->
        <img class="child image" {style} src={imageUrl($saveStore, selected)} />
      {/if}
    {/if}

    <div class="background image" {style} />
  </div>
</Magnifier>

<style>
  .imageContainer {
    position: relative;
  }

  .image {
    position: absolute;
    left: 0;
    top: 0;
  }

  .background {
    z-index: 0;
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
