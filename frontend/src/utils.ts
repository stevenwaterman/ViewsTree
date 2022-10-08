import type { Readable, Writable } from "svelte/store";
import { derived, writable } from "svelte/store";

export function firstLetterUC(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function unwrapStore<T, INNER extends Readable<T | null>>(store_2: Readable<INNER | null>, equality: (a: T, b: T) => boolean = (a, b) => a === b): Readable<T | null> {
  let value: T | null = null;
  const output: Writable<T | null> = writable(null);
  let unsubscribe: () => void = () => { };
  store_2.subscribe((store: INNER | null) => {
    unsubscribe();
    if (store !== null) {
      unsubscribe = store.subscribe((state: T | null) => {
        if ( 
          (value === null && state !== null) ||
          (value !== null && state === null) ||
          (value !== null && state !== null && !equality(value, state))
        ) {
          value = state;
          output.set(state);
        }
      })
    } else {
      unsubscribe = () => { };
      value = null;
      output.set(null);
    }
  });
  return output;
}

export function unwrapStoreNonNull<T, INNER extends Readable<T>>(store_2: Readable<INNER>, initialValue: T, equality: (a: T, b: T) => boolean = (a, b) => a === b): Readable<T> {
  let value: T = initialValue;
  const output: Writable<T> = writable(initialValue);
  output.subscribe(state => {
    console.log("Output changed", state);
  })
  let unsubscribe: () => void = () => { };
  store_2.subscribe((store: INNER) => {
    unsubscribe();
    unsubscribe = store.subscribe((state: T) => {
      if (!equality(value, state)) {
        value = state;
        output.set(state);
      }
    })
  });
  return output;
}

export function mapUnwrap<T, U>(stores: Readable<T[]>, mapper: (input: T) => Readable<U>): Readable<U[]> {
  const wrappedStore: Readable<Readable<U[]>> = derived(stores, states => {
    const mappedStores: Readable<U>[] = states.map(state => mapper(state));
    mappedStores.forEach(store => {
      store.subscribe(console.log);
    })
    return derived(mappedStores, values => values);
  })

  // This is a hack, for some reason `value` in unwrapStore seems to always be updated instantly via magic, meaning equality returns false when it just changed
  const equality = (_a: any, _b: any) => false;
  const unwrappedStore: Readable<U[]> = unwrapStoreNonNull(wrappedStore, [] as U[], equality);
  return unwrappedStore;
}

type Stores = Readable<any> | [Readable<any>, ...Array<Readable<any>>];
type StoresValues<T> = T extends Readable<infer U> ? U : {
  [K in keyof T]: T[K] extends Readable<infer U> ? U : never;
};
export function maybeDerived<S extends Stores, T>(
  stores: S,
  func: (values: StoresValues<S>) => T,
  initial: T,
  equality: (last: T, next: T) => boolean = (a, b) => (a === b)
): Readable<T> {
  let lastValue: T = initial;
  const actualFunc = (stores: StoresValues<S>, set: (value: T) => void) => {
    const nextValue = func(stores);
    if (!equality(lastValue, nextValue)) {
      lastValue = nextValue;
      set(nextValue);
    }
  };
  return derived(stores, actualFunc, initial);
}

export function arrayEqualNullable<T>(a: T[] | null, b: T[] | null, elementEquality: (a: T, b: T) => boolean = (a: T, b: T) => a === b): boolean {
  if (a === null && b === null) return true;
  if (a !== null && b !== null) return arrayEqual(a, b, elementEquality);
  return false;
}

export function arrayEqual<T>(a: T[], b: T[], elementEquality: (a: T, b: T) => boolean = (a: T, b: T) => a === b): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (!elementEquality(a[i], b[i])) return false;
  }
  return true;
}
