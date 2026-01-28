import type { SvelteComponentTyped, ComponentType } from "svelte";
import { writable, type Writable } from "svelte/store";
import { bind } from "svelte-simple-modal";

const modalComponentInner: Writable<ComponentType | undefined> =
  writable(undefined);

function open<Props extends Record<string, any>>(
  component: ComponentType<SvelteComponentTyped<Props>>,
  ...props: {} extends Props ? [] : [Props]
) {
  let actualProps: Props = (props.length === 0 ? {} : props[0]) as Props;
  modalComponentInner.set(bind(component, actualProps));
}

export const modalComponent = {
  subscribe: modalComponentInner.subscribe,
  open,
  close: () => modalComponentInner.set(undefined)
};
