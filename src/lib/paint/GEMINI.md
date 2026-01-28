# Masking Logic

## Workflow Requirements
- **Color Inversion:** The UI painter uses Black for masked areas. ComfyUI workflows expect the opposite, so an `InvertMask` node is inserted before the `InpaintModelConditioning`.
- **Scaling Sequence:** To handle resolution changes, the mask is loaded as an image, scaled using `ImageScale` (Lanczos), and then converted via `ImageToMask`.