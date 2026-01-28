# Upload Synchronization

## Resolution Locking
The image cropper modal is synchronized with the `generationSettingsStore`.
- **Logic:** The selection area is locked to the current target aspect ratio and is scaled exactly to the current `width`/`height` before being uploaded.
- **Outcome:** This ensures the lineage starts at the user's preferred resolution immediately upon upload.