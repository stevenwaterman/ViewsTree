<script lang="ts">
  import { generateRoot, type NodeConfig } from "./lib/bridge";

  const saveName = "test";

  let images: NodeConfig[] = [];

  async function generateAndFetch() {
    generateRoot(saveName, {
      prompt: "egg",
      steps: 20
    }).then(config => {
      images = [...images, config]
    });
  }
</script>


<button on:click={() => generateAndFetch()}>Generate</button>

{#each images as config}
  <!-- svelte-ignore a11y-missing-attribute -->
  <img src={`http://localhost:5001/${saveName}/image/${config.id}`}/>
{/each}
