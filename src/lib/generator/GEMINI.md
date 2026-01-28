# ComfyUI Integration

## Critical Technical Quirks

### 1. The ` [output]` Suffix
ComfyUI API requires a specific string suffix to load images from its own `output` directory:
- **Rule:** Filenames for `type: "output"` images must be passed as `"filename.png [output]"`.
- **Note:** This is handled automatically by the `getLoaderNode` helper.

### 2. WebSocket & History Fallback
Generation results are event-driven:
- **`executed`:** Standard result path.
- **`execution_cached`:** Occurs if ComfyUI reuses a result. In this state, the system **must** query `client.getHistory(prompt_id)` to retrieve the asset metadata.

### 3. Client-side Cropping
Images are cropped/scaled on the client via `<canvas>` before being uploaded to ComfyUI. This ensures the server only processes the exact pixels required for the target resolution.

### 4. LoRA Chaining
LoRAs are chained sequentially between the Loader and the Sampler. Each `LoraLoader` node threads both the `model` and `clip` outputs into the next one in the array.