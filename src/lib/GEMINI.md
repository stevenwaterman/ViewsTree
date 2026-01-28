# Shared Utilities & Patterns

## Stateful Stores (`utils.ts`)
Standard Svelte stores are asynchronous. `stateful(store)` adds a synchronous `.state` property.
- **Critical:** Used everywhere for immediate serialization and logic checks.
- **Rule:** Never mutate `.state` directly; always use `.update()` or `.set()`.

## Complex Reactivity
- **`mapUnwrap`:** Recursively calculates values across the tree (e.g., `leafCount`). It takes a store of items and a mapper that returns stores, then flattens them into a single reactive array.
- **`tweenedWritable`:** Provides both instant and smooth (`sineInOut`) values for UI elements that need both snappiness and visual polish.