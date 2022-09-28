<script lang="ts">
  export let disabled: true | undefined = undefined;
  export let emphasise: true | undefined = undefined;
  export let fileTypes: string = "";
  export let handleFile: (file: File) => void = () => {};

  let input: HTMLInputElement;

  function fileEvent() {
    const files: FileList | null = input.files;
    if (files && files.length) {
      handleFile(files[0]);
    }
    input.files = null;
  }

  function dropEvent(event: DragEvent) {
    const dataTransfer = event.dataTransfer;
    if (dataTransfer !== null) {
      const files = dataTransfer.files;
      const file = files.item(0);
      if (file !== null) {
        handleFile(file);
      }
    }
  }

  let textColor: string;
  $: textColor = disabled
    ? "var(--buttonBg)"
    : emphasise
    ? "var(--textEmphasis)"
    : "var(--textDark)";

  let bgColor: string;
  $: bgColor = disabled
    ? "var(--buttonBgDisabled)"
    : emphasise
    ? "var(--text)"
    : "var(--buttonBg)";
</script>

<style>
  .button {
    display: inline-block;
    padding: 0.35em 1.2em;
    margin: 0.3em;
    border-radius: 0.12em;
    box-sizing: border-box;
    text-align: center;
    transition: all 0.1s;
    cursor: pointer;
  }

  .enabled:hover {
    background-color: #314549;
    color: #c3cee3;
  }

  .enabled {
    cursor: pointer;
  }

  .disabled {
    cursor: default;
  }

  .hidden {
    display: none;
  }
</style>

{#if disabled}
  <label for="upload" class="button disabled">
    <slot />
  </label>
{:else}
  <div
    on:dragover|preventDefault|stopPropagation
    on:drop|preventDefault|stopPropagation={dropEvent}>
    <label
      for="upload"
      class="button enabled"
      style={`color: ${textColor}; backgroundColor: ${bgColor};`}
    >
      <slot />
      <input
        id="upload"
        class="hidden"
        type="file"
        bind:this={input}
        accept={fileTypes}
        multiple={false}
        on:input|preventDefault|stopPropagation={fileEvent} />
    </label>
  </div>
{/if}
