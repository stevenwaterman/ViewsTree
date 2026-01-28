# State Management & Tree Structure

The core of ViewsTree is its hierarchical node system, managed through Svelte stores.

## Node Hierarchy
- **RootNode:** The base of the tree (one per save).
- **PrimaryBranchNodes:** Direct children of Root (`TxtImg`, `Upload`).
- **SecondaryBranchNodes:** Children of other branch nodes (`ImgImg`, `Mask`, `Inpaint`).

## Key Concepts
- **Reactivity:** Each node contains its own stores (children, pending requests, leaf counts). Updating a node's children automatically triggers UI updates in the tree visualization.
- **Node Definitions:** Defined in `src/lib/state/nodeTypes/`. Each type has a specific `load` and `serialise` logic.
- **Selection:** `selectedStore.ts` tracks the currently focused node, which is then used by the `ViewPanel` and `GeneratorPanel`.
- **Serialization:** Nodes are serialized to a nested JSON structure for saving/loading.
