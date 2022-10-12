<script lang="ts">
  import { selectedStore } from "../state/selected";
  import type { NodeState } from "../state/tree";
  import { imageUrl } from "../generator/generator";
  import { generationSettingsStore, saveNameStore } from "../state/settings";
    import Magnifier from "./Magnifier.svelte";

  let selected: NodeState | undefined;
  $: selected = $selectedStore;

  let parent: NodeState | undefined;
  $: parent = selected?.["parent"];

  export let compareParent: boolean = false;
  export let differenceParent: boolean = false;
  let showParent: boolean;
  $: showParent = compareParent || differenceParent;

  let style: string;
  $: style = `width: ${$generationSettingsStore.width}px; height: ${$generationSettingsStore.height}px;`;
</script>

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
    background: repeating-conic-gradient(var(--border) 0% 25%, var(--bgDark) 0% 50%) 50% / 32px 32px;
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

<Magnifier>
  <div class="imageContainer" {style}>
    {#if selected !== undefined}
      <!-- svelte-ignore a11y-missing-attribute -->
      <img class="child image" {style} src={imageUrl($saveNameStore, selected)}/>
    {/if}
  
    {#if parent !== undefined && showParent}
      <!-- svelte-ignore a11y-missing-attribute -->
      <img class="parent image" {style} class:difference={differenceParent} src={imageUrl($saveNameStore, parent)}/>
    {/if}
  
    <div class="background image" {style}/>
  </div>
</Magnifier>
