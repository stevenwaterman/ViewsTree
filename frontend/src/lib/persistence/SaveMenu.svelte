<script lang="ts">
  import SaveCreator from "./SaveCreator.svelte";
  import SaveOption from "./SaveOption.svelte";
  import { saveNameOptionsStore, saveStore } from "./saves";
</script>

<div class="menu">
  {#each $saveNameOptionsStore as option (option)}
    <SaveOption saveName={option} />
  {/each}
  <SaveCreator />
</div>

<style>
  .menu {
    display: flex;
    flex-direction: column;
  }
</style>
