# Backend & Generation (ComfyUI)

This directory manages communication with the ComfyUI server.

## ComfyUI Integration
- **Client:** `comfyClient.ts` initializes the `ComfyApi` connecting to `http://localhost:8188`. 
- **CORS:** Requires ComfyUI to be started with `--enable-cors-header http://localhost:5000`.
- **Generation Logic:** `comfyGenerator.ts` handles the queue and workflow construction.

## Current Implementation Status
- **Txt2Img:** Fully implemented. Dynamically constructs a ComfyUI workflow (Checkpoint Loader -> CLIP Encode -> KSampler -> Decode -> Save).
- **Img2Img / Inpaint:** Currently stubbed, awaiting implementation of image upload and differential diffusion workflows.
- **Asset Handling:** Uses `client.getPathImage()` based on node metadata to fetch results directly from ComfyUI.

## Polling & Queue
- Uses a polling mechanism on the history endpoint to detect when a `prompt_id` has finished processing.
- Maintains a client-side queue to manage multiple pending requests across the tree.