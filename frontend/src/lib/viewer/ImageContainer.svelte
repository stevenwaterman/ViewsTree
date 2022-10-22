<script lang="ts">
  import { imageUrl } from "../generator/generator";
  import Magnifier from "./Magnifier.svelte";
  import { selectedStore } from "../state/selected";
  import { generationSettingsStore } from "../state/settings";
  import type { AnyNode } from "../state/nodeTypes/nodes";
  import { saveStore } from "../persistence/saves";

  let selected: AnyNode;
  $: selected = $selectedStore;

  let parent: AnyNode | undefined;
  $: parent = selected.parent;

  export let compareParent: boolean = false;
  export let differenceParent: boolean = false;
  let showParent: boolean;
  $: showParent = compareParent || differenceParent;

  let style: string;
  $: style = `width: ${$generationSettingsStore.width}px; height: ${$generationSettingsStore.height}px;`;
</script>

<Magnifier>
  <div class="imageContainer" {style}>
    {#if selected.isBranch}
      <!-- svelte-ignore a11y-missing-attribute -->
      <img class="child image" {style} src={imageUrl($saveStore, selected)} />
    {/if}

    {#if parent?.isBranch && showParent}
      <!-- svelte-ignore a11y-missing-attribute -->
      <img
        class="parent image"
        {style}
        class:difference={differenceParent}
        src={imageUrl($saveStore, parent)}
      />
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
</style>
