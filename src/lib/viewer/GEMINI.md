# Preview & Magnification

## Implementation Details

### Magnification Math
Zoom coordinates are calculated relative to the element's actual bounding box (`getBoundingClientRect`) rather than fixed sizes. This ensures magnification accuracy even when the square preview container scales the image down.

### Mask Scaling
To ensure the mask overlay correctly follows the image during resolution changes:
- **CSS:** `mask-size: 100% 100%` and `mask-repeat: no-repeat` are mandatory on the `<img>` element.