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

  export let hovered: boolean = false;

  function onClick(event: MouseEvent) {
    // console.log(event);
    if (disabled) {
      event.stopPropagation();
    }
  }
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
    user-select: none;
  }

  .enabled:hover {
    background-color: #314549;
    color: #c3cee3;
  }

  .enabled {
    cursor: pointer;
  }

  .button:not(.enabled) {
    cursor: default;
  }
</style>

<div
  class="button"
  class:enabled={!disabled}
  style={actualStyle}
  on:click
  on:click={onClick}
  on:mouseenter={() => {hovered = true;}}
  on:mouseleave={() => {hovered = false;}}
>
  <slot {hovered}/>
</div>
