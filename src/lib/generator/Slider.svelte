<script lang="ts">
  import { createEventDispatcher } from "svelte";

  export let label: string;
  export let id: string = label;
  export let min: number = 0;
  export let max: number = 100;
  export let step: number = 1;
  export let disabled: boolean = false;
  export let showLabel: boolean = true;
  export let integer: boolean = false;
  export let decimals: number = 2;

  export let value: number;

  let input: HTMLInputElement;
  const dispatch = createEventDispatcher();

  function focus() {
    if (input) input.focus();
  }

  function handleInput(e: Event) {
    const val = parseFloat((e.target as HTMLInputElement).value);
    value = val;
    dispatch("change", val);
  }

  function onWheel(e: WheelEvent) {
    if (disabled) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -step : step;
    let next = value + delta;
    if (min !== undefined) next = Math.max(min, next);
    if (max !== undefined) next = Math.min(max, next);
    value = next;
    dispatch("change", value);
  }

  // Check if the extra slot is being used
  $: hasExtra = $$slots.extra;
</script>

{#if showLabel}
  <!-- svelte-ignore a11y-mouse-events-have-key-events -->
  <label for={id} on:mouseenter={focus}>{label}</label>
{/if}
<!-- svelte-ignore a11y-mouse-events-have-key-events -->
<div class="slider-contents" on:mouseenter={focus} on:wheel={onWheel}>
  <input
    {id}
    type="range"
    {min}
    {max}
    {step}
    {disabled}
    value={value}
    on:input={handleInput}
    bind:this={input}
    on:keydown|preventDefault
  />
  <div class="value-row" class:has-extra={hasExtra}>
    <span>{integer ? value.toFixed(0) : value.toFixed(decimals)}</span>
    {#if hasExtra}
        <slot name="extra" />
    {/if}
  </div>
</div>

<style>
  label {
    user-select: none;
    align-self: center;
  }

  .slider-contents {
    display: contents;
  }

  .value-row {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0.5em;
    justify-content: center;
    justify-self: center;
  }

  span {
    text-align: center;
    user-select: none;
    font-variant-numeric: tabular-nums;
  }

  input {
    outline: none;
    width: 100%;
  }
</style>