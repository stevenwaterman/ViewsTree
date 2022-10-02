<script lang="ts">
  import { contextModalStore } from "./ContextModalStore";
  import type { ContextModalState } from "./ContextModalStore";
  import { afterUpdate } from "svelte";
  import Button from "../buttons/Button.svelte";
  import type { NodeState, BranchState } from "../state/tree";
  import { saveNameStore } from "../state/settings";

  let contextModalState: ContextModalState;
  $: contextModalState = $contextModalStore;

  let coordinates: [number, number] | undefined;
  $: coordinates = contextModalState?.coordinates;

  let left: number | undefined;
  $: left = coordinates === undefined ? undefined : coordinates[0] - 40;

  let top: number | undefined;
  $: top = coordinates === undefined ? undefined : coordinates[1] - 40;

  let nodeState: NodeState | undefined;
  $: nodeState = contextModalState?.state;

  function hide() {
    contextModalStore.set(null);
  }

  function deleteNode() {
    hide();
    nodeState?.remove();
  }

  function keyPressed(event: KeyboardEvent) {
    // if (event.key === "r") return loadMore();
    // if (event.key === "a") return openImportModal();
    // if (event.key === "s" && showBranch) return openExportModal();
    if (event.key === "d") return deleteNode();
  }

  let rootContainer: HTMLDivElement | undefined;
  let branchContainer: HTMLDivElement | undefined;

  afterUpdate(() => {
    if (rootContainer) rootContainer.focus();
    if (branchContainer) branchContainer.focus();
  });
</script>

<style>
  .container {
    position: fixed;
    z-index: 2;
    left: 0;
    top: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
  }

  .contextModal {
    position: absolute;
    display: flex;
    flex-direction: column;
    margin: 25px;
    width: 150px;
    pointer-events: all;
    padding: 4px;
    outline: none;

    background-color: var(--bgDark);
    border: 1px solid;
    border-color: var(--border);
    color: var(--textDark);
  }
</style>

<div class="container">
  {#if nodeState}
    <div
      class="contextModalContainer"
      on:mouseleave={hide}
      style={`left: ${left}px; top: ${top}px;`}>
      <div
        class="contextModal"
        style={`left: ${left}px; top: ${top}px;`}
        bind:this={branchContainer}
        on:mousedown|preventDefault|stopPropagation
        on:contextmenu|preventDefault|stopPropagation
        on:keydown={keyPressed}
        tabindex={0}>
        <!-- <Button on:click={loadMore}> -->
          <!-- <u>R</u>equest More -->
        <!-- </Button> -->
        <!-- <Button on:click={openImportModal}> -->
          <!-- <u>A</u>dd Midi -->
        <!-- </Button> -->
        <!-- <Button on:click={openExportModal}> -->
          <!-- <u>S</u>ave Audio -->
        <!-- </Button> -->
        <Button on:click={deleteNode}>
          <u>D</u>elete Node
        </Button>
        <!--         TODO   <Button>Edit</Button>-->
      </div>
    </div>
  {/if}
</div>
