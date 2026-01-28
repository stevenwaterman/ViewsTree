# ViewsTree Overview

ViewsTree is an AI image generation frontend that organizes generations into a hierarchical tree structure. This allows users to track the lineage of their images, seeing exactly how a particular result was derived (e.g., Txt2Img -> Img2Img -> Inpaint).

## Technical Stack
- **Framework:** Svelte 3
- **Build Tool:** Vite
- **Language:** TypeScript
- **Key Libraries:**
    - `panzoom`: Enables navigation (pan/zoom) of the large tree visualization.
    - `svelte-simple-modal`: Used for various UI modals (Save/Load, Settings, etc.).

## Core Subdirectories
- `src/lib/state/`: Core data models and hierarchical node definitions.
- `src/lib/treeVis/`: Components and logic for rendering the tree.
- `src/lib/generator/`: Request queue management and backend communication (Legacy).
- `src/lib/viewer/`: UI for viewing selected images and their parameters.
- `src/lib/paint/`: Inpainting and masking tools.
- `src/lib/persistence/`: Save/Load logic and serialization.
