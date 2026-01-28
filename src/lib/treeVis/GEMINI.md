# Tree Visualization

This directory handles the visual rendering of the hierarchical node tree.

## Rendering Logic
- **`TreeVis.svelte`:** The main entry point, using `panzoom` for navigation.
- **`VisRoot.svelte`, `VisBranch.svelte`:** Recursive components that render the nodes.
- **`placement.ts`:** Calculates the horizontal offsets for nodes based on their sub-tree leaf counts. It centers branches above their children to create a balanced layout.

## Styling
- Node dimensions and margins are defined as constants in `placement.ts`.
- CSS variables (e.g., `--textEmphasis`, `--border`) are used for consistent theming.
