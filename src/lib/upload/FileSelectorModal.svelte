<script lang="ts">
  import { modalComponent } from "../modalStore";
  import ImageCropper from "./ImageCropper.svelte";

  let files: FileList;

  let firstFile: File | null;
  $: firstFile = files?.item(0) ?? null;

  function readAsBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (e) => reject(e);
    });
  }

  let fileBase64Promise: Promise<string> | null;
  $: fileBase64Promise = firstFile === null ? null : readAsBase64(firstFile);
</script>

<input type="file" accept="image/*" bind:files />

{#if fileBase64Promise !== null}
  {#await fileBase64Promise then fileBase64}
    <ImageCropper image={fileBase64} />
  {/await}
{/if}
