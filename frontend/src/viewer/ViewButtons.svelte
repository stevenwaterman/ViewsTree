<script lang="ts">
  import { selectedStore } from "../state/selected";
  import Button from "../buttons/Button.svelte";
  import type { NodeState } from "../state/tree";

  let parent: NodeState | undefined;
  $: parent = $selectedStore?.["parent"];

  let disabled: boolean;
  $: disabled = parent === undefined;

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
  <Button bind:hovered={compareParent} {disabled}>Show Parent</Button>
  <Button bind:hovered={differenceParent} {disabled}>Show Difference</Button>
</div>