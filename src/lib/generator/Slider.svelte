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
  export let suffix: string = "";
  export let displayMultiplier: number = 1;

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
    <span>{(integer ? (value * displayMultiplier).toFixed(0) : (value * displayMultiplier).toFixed(decimals))}{suffix}</span>
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
    appearance: none;
    -webkit-appearance: none;
    background: transparent;
  }

  /* Webkit (Chrome, Safari, Edge, Opera) */
  input::-webkit-slider-runnable-track {
    width: 100%;
    height: 4px;
    cursor: pointer;
    background: var(--border);
    border-radius: 2px;
  }

  input::-webkit-slider-thumb {
    height: 14px;
    width: 14px;
    border-radius: 50%;
    background: var(--nodeInactive);
    cursor: pointer;
    -webkit-appearance: none;
    margin-top: -5px; /* Centers thumb on track */
    box-shadow: 0 0 2px rgba(0,0,0,0.5);
    transition: transform 0.1s ease-in-out;
  }

  input:active::-webkit-slider-thumb {
    transform: scale(1.2);
  }

  /* Firefox */
  input::-moz-range-track {
    width: 100%;
    height: 4px;
    cursor: pointer;
    background: var(--border);
    border-radius: 2px;
  }

  input::-moz-range-thumb {
    height: 14px;
    width: 14px;
    border-radius: 50%;
    background: var(--nodeInactive);
    cursor: pointer;
    border: none;
    box-shadow: 0 0 2px rgba(0,0,0,0.5);
    transition: transform 0.1s ease-in-out;
  }

  input:active::-moz-range-thumb {
    transform: scale(1.2);
  }

  :global(.small-btn) {
    background: var(--buttonBg);
    border: 1px solid var(--border);
    color: var(--text);
  }

  :global(.small-btn:disabled) {
    background: var(--buttonBgDisabled);
    opacity: 0.5;
  }
</style>