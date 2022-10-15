<script lang="ts">
  import Button from "../buttons/Button.svelte";
  import type { AnyNode } from "../state/nodeTypes/nodes";
  import { selectedStore } from "../state/selected";

  let parent: AnyNode | undefined;
  $: parent = $selectedStore.parent;

  let disabled: boolean;
  $: disabled = parent === undefined || parent.type === "Root";

  export let compareParent: boolean;
  export let differenceParent: boolean;
</script>

<style>
  .buttonsContainer {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
  }
</style>

<div class="buttonsContainer">
  <Button bind:pressed={compareParent} {disabled}>Show Parent</Button>
  <Button bind:pressed={differenceParent} {disabled}>Show Difference</Button>
</div>