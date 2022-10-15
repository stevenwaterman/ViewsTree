import numpy as np
import cv2
from PIL import Image
from skimage import exposure

def compute_cc_target(target_images):
  if target_images is None or len(target_images)==0:
      return None

  target_histogram = (cv2.cvtColor(np.asarray(target_images[0].copy()), cv2.COLOR_RGB2LAB)*0).astype('float64')
  for img in target_images:
      target_histogram_component = cv2.cvtColor(np.asarray(img.copy()), cv2.COLOR_RGB2LAB).astype('float64')
      target_histogram += (target_histogram_component/len(target_images)).astype('float64')
              
  target_histogram=target_histogram.astype('uint8')
  
  return target_histogram

def apply_color_correction(image, reference_images):
  target_histogram = compute_cc_target(reference_images)
  image = Image.fromarray(cv2.cvtColor(exposure.match_histograms(
      cv2.cvtColor(
          np.asarray(image),
          cv2.COLOR_RGB2LAB
      ),
      target_histogram,
      channel_axis=2
  ), cv2.COLOR_LAB2RGB).astype("uint8"))

  return image