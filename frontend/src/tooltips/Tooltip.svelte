<style>
  .TT_text {
    visibility: hidden;
    padding: 5px;
    font-weight: 400;
    font-size: 12px;
    margin-left: 12px;
    pointer-events: none;

    position: absolute;
    z-index: 1;

    border: 1px solid;
    border-color: var(--border);
    background-color: var(--bgLight);
    color: var(--textDark);
  }

  .TT_trigger:hover .TT_text {
    visibility: visible;
  }
</style>

<div>
  <div class="TT_trigger">
    <slot name="trigger" />
    <div class="TT_text">
      <slot />
    </div>
  </div>
</div>
