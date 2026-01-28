<script lang="ts">
  export let label: string;
  export let id: string = label;
  export let min: number = 0;
  export let max: number = 100;
  export let step: number = 1;
  export let disabled: boolean = false;

  export let value: number;

  let input: HTMLInputElement;

  function focus() {
    input.focus();
  }

  function onWheel(e: WheelEvent) {
    if (disabled) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -step : step;
    let next = value + delta;
    if (min !== undefined) next = Math.max(min, next);
    if (max !== undefined) next = Math.min(max, next);
    value = next;
  }
</script>

<!-- svelte-ignore a11y-mouse-events-have-key-events -->
<label for={id} on:mouseenter={focus}>{label}</label>
<!-- svelte-ignore a11y-mouse-events-have-key-events -->
<div class="row" on:mouseenter={focus} on:wheel={onWheel}>
  <input
    {id}
    type="range"
    {min}
    {max}
    {step}
    {disabled}
    bind:value
    bind:this={input}
    on:keydown|preventDefault
  />
  <span>{value}</span>
</div>

<style>
  label {
    user-select: none;
  }

  .row {
    display: grid;
    grid-template-columns: 1fr 3em;
  }

  span {
    text-align: right;
    user-select: none;
  }

  input {
    outline: none;
  }
</style>