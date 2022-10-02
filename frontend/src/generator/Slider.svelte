<script lang="ts">
  export let label: string;
  export let id: string = label;
  export let min: number | undefined = undefined;
  export let max: number | undefined = undefined;
  export let step: number | undefined = undefined;

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
  <input id={id} type="range" {min} {max} {step} bind:value/>
  <span>{value}</span>
</div>
