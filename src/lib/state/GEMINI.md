# State & Selection

## Key Logic

### ModelsHash
Every node stores a `modelsHash` derived from its specific generation settings (checkpoint, VAE, LoRAs, etc.).
- **Purpose:** Used to detect if global settings have changed relative to a node's original parameters.

### Deep Cloning (LoRAs)
When selecting a node, its LoRAs are **deep-cloned** (`JSON.parse(JSON.stringify)`).
- **Why:** To prevent the Settings Panel (which binds to the store) from accidentally mutating the immutable historical data of the node itself.

### Dynamic UI (`supportsCfg`)
The `supportsCfg` flag in a Model Config dynamically hides/shows the `Scale` slider and `Negative Prompt` textarea in the UI and locks `scale` to 1 in the workflow.