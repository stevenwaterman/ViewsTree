<script lang="ts">
  import ViewButtons from "./ViewButtons.svelte";
  import ImageContainer from "./ImageContainer.svelte";

  let compareParent: boolean = false;
  let differenceParent: boolean = false;
</script>

<style>
  .container {
    display: grid;
    grid-template-columns: auto;
    grid-template-rows: auto 1fr;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 100%;
  }
</style>

<div class="container">
  <ImageContainer {compareParent} {differenceParent} />
  <ViewButtons bind:compareParent bind:differenceParent />
</div>
