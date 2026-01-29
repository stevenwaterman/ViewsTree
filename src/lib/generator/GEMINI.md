# ComfyUI Integration

This document provides a comprehensive deep-dive into the `@saintno/comfyui-sdk`. It is designed to be the single source of truth for integrating and extending ComfyUI capabilities within ViewsTree.

For a full API reference, see the readme in `node_modules/@saintno/comfyui-sdk/README.md`

---

## 🏗️ Core Architecture

The SDK is divided into four primary modules:
1.  **`ComfyApi`**: Transport layer (HTTP/WebSocket/Auth).
2.  **`PromptBuilder`**: Template engine for workflow manipulation.
3.  **`CallWrapper`**: Execution lifecycle manager.
4.  **`ComfyPool`**: Multi-instance orchestrator.

---

## 📄 1. Workflow JSON Formats

ComfyUI has two primary JSON formats. The SDK **requires the API Format**.

### API Format vs. Web Format
- **Web Format**: Contains UI metadata (node positions, colors). Not compatible with the API.
- **API Format**: A flat dictionary where keys are node IDs and values contain `inputs` and `class_type`.
  - To get this: Enable "Dev mode" in ComfyUI settings and use "Save (API Format)".

### JSON Structure Example
```json
{
  "3": {
    "inputs": {
      "seed": 123,
      "steps": 20,
      "model": ["4", 0],
      "positive": ["6", 0]
    },
    "class_type": "KSampler"
  },
  "4": {
    "inputs": { "ckpt_name": "sdxl.safetensors" },
    "class_type": "CheckpointLoaderSimple"
  }
}
```
*Note: Connections are represented as `["node_id", output_index]`.*

---

## 🧩 2. PromptBuilder: Orchestration

`PromptBuilder` maps friendly keys to the cryptic node IDs in the JSON.

### Creating a Complex Template
```typescript
const workflow = new PromptBuilder(
  complexJson,
  ["prompt", "negative", "width", "height", "upscale_factor"], // Input Keys
  ["preview", "final_save"]                                    // Output Keys
)
.setInputNode("prompt", "6.inputs.text")
.setInputNode("width", ["5.inputs.width", "12.inputs.width"]) // Multi-mapping
.setOutputNode("preview", "9")
.setOutputNode("final_save", "15");
```

### Advanced Workflow Manipulation
- **`bypass(nodeId)`**: Dynamically removes a node and heals the graph (connects inputs to outputs of the same type).
- **`reinstate(nodeId)`**: Restores a bypassed node.
- **`inputRaw(path, value)`**: Set a value without a pre-mapped key (e.g., `builder.inputRaw("3.inputs.denoise", 0.5)`).

---

## 🔄 3. Lifecycle: Run, Wait, and Cancel

The `CallWrapper` is used to trigger a prompt and handle its state.

### Triggering and Waiting
```typescript
const runner = new CallWrapper(api, builder.input("prompt", "A high-tech city"));

// Hook into events
runner.onProgress((p) => console.log(`Progress: ${p.value}/${p.max}`));
runner.onPreview((blob) => showGhostImage(blob));

// The 'run' method returns a promise that resolves when all mapped output nodes finish
const result = await runner.run(); 

if (result) {
  console.log("Final Images:", result.final_save.images);
}
```

### Cancellation Logic
There are two levels of cancellation:

1.  **Interrupt Current Execution**:
    ```typescript
    // This sends a POST /interrupt to the server.
    // It stops the CURRENTLY ACTIVE prompt immediately.
    await api.interrupt(); 
    ```

2.  **Cancel Queued Prompts**:
    The SDK does not have a high-level `api.cancel(promptId)` method. You must use `fetchApi` to manually interact with the ComfyUI queue endpoints:
    
    **To delete a specific prompt from the queue:**
    ```typescript
    await api.fetchApi("/queue", {
      method: "POST",
      body: JSON.stringify({ delete: [promptId] }),
      headers: { "Content-Type": "application/json" }
    });
    ```
    
    **To clear the entire queue:**
    ```typescript
    await api.fetchApi("/queue", {
      method: "POST",
      body: JSON.stringify({ clear: true }),
      headers: { "Content-Type": "application/json" }
    });
    ```

**ViewsTree Implementation Note**: In `comfyGenerator.ts`, the `cancelRequest` function currently calls `interrupt()`. To cancel a *queued* request before it starts, you should first identify its `prompt_id` and send the `delete` command as shown above.


---

## 🤹 4. ComfyPool: Parallel Execution

If ViewsTree is connected to multiple GPUs, use `ComfyPool`.

```typescript
const pool = new ComfyPool([api1, api2], EQueueMode.PICK_LOWEST);

// Create a generator function
const task = async (api: ComfyApi) => {
  return new CallWrapper(api, myTemplate).run();
};

// Queue 5 jobs. The pool will distribute them to the least-busy server.
const allResults = await pool.batch([task, task, task, task, task]);
```

---

## 🛠️ ViewsTree Implementation Details

### 1. The ` [output]` Suffix
When loading images from ComfyUI's own `output` folder (e.g., for Img2Img on a previously generated image), the filename **must** end in ` [output]`.
- **SDK Internal**: `LoadImageOutput` class type usually expects this.
- **ViewsTree Helper**: `getLoaderNode` in `comfyGenerator.ts` handles this logic.

### 2. Binary Previews (`b_preview`)
ComfyUI sends intermediate generation steps over WebSockets as binary frames.
- **Byte 0-3**: Event Type (1 = Preview).
- **Byte 4-7**: Image Format (1 = JPEG, 2 = PNG).
- **Byte 8+**: Raw image data.
The SDK converts this to a `Blob` and dispatches `b_preview`.

### 3. Error Recovery
- **`DisconnectedError`**: Thrown if the WebSocket closes while `run()` is awaiting. ViewsTree should catch this and offer a "Retry" or "Reconnect" UI.
- **Polling Fallback**: If `forceWs` is false (default), `ComfyApi` will automatically switch to `GET /prompt` polling if the WebSocket fails to initialize.