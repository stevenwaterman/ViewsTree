# State Management & Tree Structure

The core of ViewsTree is its hierarchical node system, managed through Svelte stores.

## Node Hierarchy
- **RootNode:** The base of the tree (one per save).
- **PrimaryBranchNodes:** Direct children of Root (`TxtImg`, `Upload`).
- **SecondaryBranchNodes:** Children of other branch nodes (`ImgImg`, `Mask`, `Inpaint`).

## Key Concepts
- **ComfySettings:** Replaced the legacy weighted model system with explicit `checkpoint`, `vae`, `clip`, `sampler_name`, and `scheduler` selections.
- **Node Metadata:** Nodes now store `comfyImage` objects (filename, subfolder, type) to correctly retrieve assets from the ComfyUI output directory.
- **Selection:** `selectedStore.ts` tracks the focused node, automatically updating the `GeneratorPanel` with the node's original parameters.
- **Serialization:** Full tree state, including ComfyUI image references, is serialized to JSON for persistence.