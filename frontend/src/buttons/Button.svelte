<script lang="ts">
  export let disabled: boolean | undefined = undefined;
  export let emphasise: boolean | undefined = undefined;

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

  let actualStyle: string;
  $: actualStyle = `color: ${textColor}; backgroundColor: ${bgColor};`;
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
</style>

{#if disabled}
  <div class="button disabled" style={actualStyle}>
    <slot />
  </div>
{:else}
  <div class="button enabled" on:click style={actualStyle}>
    <slot />
  </div>
{/if}
