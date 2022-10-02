<script lang="ts">
  import { selectedStore, type NodeState } from "../state/tree";
  import Button from "../buttons/Button.svelte";

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
    flex-direction: column;
    align-items: center;
  }
</style>

<div class="buttonsContainer">
  <Button bind:hovered={compareParent} {disabled}>Show Parent</Button>
  <Button bind:hovered={differenceParent} {disabled}>Show Difference</Button>
</div>