# Backend & Generation (Legacy)

This directory manages the communication with the image generation backend.

## Legacy System (HF Diffusers)
- **Queue Management:** `generator.ts` maintains a client-side queue and attempts to optimize model loading by grouping requests by `modelsHash`.
- **Endpoints:** Uses `POST` requests to a local server (port 5001) with JSON payloads.
- **Image Retrieval:** Fetches images and thumbnails via direct URLs using node IDs.

## ComfyUI Transition (Planned)
The system is being reworked to use ComfyUI. This will involve:
- **Workflow Mapping:** Converting the tree node parameters into ComfyUI's JSON workflow format.
- **WebSockets:** Using ComfyUI's websocket for real-time progress updates and status monitoring.
- **Asset Handling:** Moving from ID-based URL fetching to ComfyUI's output handling.
