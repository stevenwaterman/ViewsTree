# Tree Layout Logic

## Horizontal Placement (`placement.ts`)
The layout isn't a simple grid. It centers branches above their children:
- **Calculation:** Every node's horizontal offset is derived from the total `leafCount` of its sub-tree.
- **Visuals:** This ensures a balanced, non-overlapping visualization even as branches grow asymmetrical.
- **Coordinates:** Nodes are placed in a fixed-step vertical grid but a variable-width horizontal grid.
