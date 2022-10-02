<script lang="ts">
  import { imageUrl } from "../generator/generator";
  import { saveNameStore } from "../state/settings";
  import { selectedStore, type NodeState } from "../state/tree";
  import ViewButtons from "./ViewButtons.svelte";

  let selected: NodeState | undefined;
  $: selected = $selectedStore;

  let parent: NodeState | undefined;
  $: parent = selected?.["parent"];

  let compareParent: boolean = false;
  let differenceParent: boolean = false;
  let showParent: boolean;
  $: showParent = compareParent || differenceParent;
</script>

<style>
  .container {
    display: grid;
    grid-template-columns: auto 1fr;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 100%;
  }

  .imageContainer {
    display: grid;
  }

  img {
    max-width: 100%;
    max-height: 100%;
  }

  .childImage {
    z-index: 0;
  }

  .parentImage {
    position: absolute;
    left: 0;
    top: 0;
  }

  .difference {
    mix-blend-mode: difference;
  }
</style>

<div class="container">
  <div class="imageContainer">    
    {#if selected !== undefined}
      <!-- svelte-ignore a11y-missing-attribute -->
      <img class="childImage" src={imageUrl($saveNameStore, selected)}/>
    {/if}

    {#if parent !== undefined && showParent}
      <!-- svelte-ignore a11y-missing-attribute -->
      <img class="parentImage" class:difference={differenceParent} src={imageUrl($saveNameStore, parent)}/>
    {/if}
  </div>

  <ViewButtons bind:compareParent bind:differenceParent />
</div>
