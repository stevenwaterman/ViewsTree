<script lang="ts">
  export let label: string;
  export let id: string = label;
  export let min: number | undefined = undefined;
  export let max: number | undefined = undefined;
  export let step: number | undefined = undefined;
  export let disabled: boolean = false;

  export let value: number;

  let input: HTMLInputElement;

  function focus() {
    input.focus();
  }
</script>

<label for={id} on:mouseenter={focus}>{label}</label>
<div class="row" on:mouseenter={focus}>
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
