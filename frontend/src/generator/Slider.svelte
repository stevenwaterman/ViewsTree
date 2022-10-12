<script lang="ts">
  export let label: string;
  export let id: string = label;
  export let min: number | undefined = undefined;
  export let max: number | undefined = undefined;
  export let step: number | undefined = undefined;
  export let disabled: boolean = false;

  export let value: number;
</script>

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
</style>

<label for={id}>{label}</label>
<div class="row">
  <input id={id} type="range" {min} {max} {step} {disabled} bind:value on:keydown|stopPropagation/>
  <span>{value}</span>
</div>
