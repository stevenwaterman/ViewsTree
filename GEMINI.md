# ViewsTree Overview

## Critical Setup: ComfyUI
The backend MUST be started with CORS enabled for the frontend origin to allow API calls:
```bash
python main.py --enable-cors-header http://localhost:5000
```

## Keyboard Shortcuts (Non-Discoverable)
- **Arrows (Up/Down/Left/Right):** Navigate tree lineage.
- **'r':** Queue generation from selected node.
- **'Backspace':** Interrupt current request.
- **'Delete':** Remove selected node and its sub-tree.
- **'a':** Open Upload/Crop modal.
- **'p':** Open Inpaint/Painter modal.
- **'l':** Debug log current tree JSON.

## UI Architecture
- **Floating Panels:** Both Settings (Top-Left) and Preview (Top-Right) are fixed/floating.
- **Background Tree:** The tree visualization occupies the entire background layer.
- **Scroll UX:** All number inputs and dropdowns support scroll-wheel increments.
