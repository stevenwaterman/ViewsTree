<script lang="ts">
  import ImageContainer from "./ImageContainer.svelte";
</script>

<div class="container">
  <ImageContainer />
</div>

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
