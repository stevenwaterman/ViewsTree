# Persistence Quirks

## Portable Image References
Nodes do **not** store direct image URLs.
- **Stored Data:** `comfyImage` metadata (`filename`, `subfolder`, `type`).
- **Benefit:** This allows the frontend to reconstruct valid URLs via the `ComfyClient` even if the server address or port changes between sessions.