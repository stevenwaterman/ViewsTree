import inspect
from typing import List, Optional, Union

import torch

from diffusers import LMSDiscreteScheduler, StableDiffusionPipeline, DDIMScheduler, StableDiffusionImg2ImgPipeline
from diffusers.pipelines.stable_diffusion import StableDiffusionSafetyChecker
from tqdm.auto import tqdm
from transformers import CLIPFeatureExtractor, CLIPTextModel, CLIPTokenizer
from PIL import Image
import uuid
import numpy as np
import os
import random
import sys

def preprocess(image):
    w, h = image.size
    w, h = map(lambda x: x - x % 32, (w, h))  # resize to integer multiple of 32
    image = image.resize((w, h), resample=Image.LANCZOS)
    image = np.array(image).astype(np.float32) / 255.0
    image = image[None].transpose(0, 3, 1, 2)
    image = torch.from_numpy(image)
    image = 2.0 * image - 1.0
    return image

def thumbnail(img):
  max_width = 128
  max_height = 128

  width = img.size[0]
  height = img.size[1]

  scale = min(max_width / width, max_height / height)

  new_width = round(width * scale)
  new_height = round(height * scale)
  print("resizing", width, max_width, height, max_height, scale, new_width, new_height)

  return img.resize((new_width, new_height), Image.ANTIALIAS)

def random_seed():
  return random.randint(0,sys.maxsize)

# TODO maybe let people control this, eg only load one model at a time
class Pipeline():
  def __init__(self):
    self.busy = False

    scheduler_txt = LMSDiscreteScheduler(
      beta_start=0.00085, 
      beta_end=0.012, 
      beta_schedule="scaled_linear"
    )
    self.pipe_txt = StableDiffusionPipeline.from_pretrained(
        "./stable-diffusion-v1-4", 
        scheduler=scheduler_txt,
        # revision="fp16",
        # torch_dtype=torch.float16
    ).to("cuda")
    self.pipe_txt.safety_checker = lambda images, **kwargs: (images, False)

    scheduler_img = DDIMScheduler(
      beta_start=0.00085,
      beta_end=0.012,
      beta_schedule="scaled_linear",
      clip_sample=False,
      set_alpha_to_one=False
    )
    self.pipe_img = StableDiffusionImg2ImgPipeline.from_pretrained(
        "./stable-diffusion-v1-4", 
        scheduler=scheduler_img,
        # revision="fp16",
        # torch_dtype=torch.float16
    ).to("cuda")
    self.pipe_img.safety_checker = lambda images, **kwargs: (images, False)

  def run_txt(self, save_name, prompt, width, height, steps, scale, seed):
    if self.busy:
      return None

    self.busy = True

    if not os.path.exists(f"../data/{save_name}"):
      os.mkdir(f"../data/{save_name}")

    run_id = str(uuid.uuid4())
    file_path = f'../data/{save_name}/{run_id}'

    actual_seed = random_seed() if seed is None else seed
    generator = torch.cuda.manual_seed(actual_seed)

    with torch.autocast("cuda"):
        result = self.pipe_txt(
          prompt=prompt,
          width=width,
          height=height,
          num_inference_steps=steps,
          guidance_scale=scale,
          generator=generator
        )

        sample = result["sample"]
        image = sample[0]
    
    image.save(f'{file_path}.png')
    thumb = thumbnail(image)
    thumb.save(f'{file_path}_thumbnail.jpg')

    self.busy = False

    return {
      'type': "root",
      'prompt': prompt,
      'width': width,
      'height': height,
      'steps': steps,
      'scale': scale,
      'seed': seed,
      'actual_seed': actual_seed,
      'run_id': run_id
    }

  def run_img(self, save_name, init_run_id, prompt, steps, scale, eta, seed, strength):
    if self.busy:
      return None

    self.busy = True

    if not os.path.exists(f"../data/{save_name}"):
      os.mkdir(f"../data/{save_name}")

    run_id = str(uuid.uuid4())
    file_path = f'../data/{save_name}/{run_id}'
    init_path = f'../data/{save_name}/{init_run_id}.png'

    actual_seed = random_seed() if seed is None else seed
    generator = torch.cuda.manual_seed(actual_seed)

    with torch.autocast("cuda"):
        img = Image.open(init_path)
        init_image = preprocess(img)
        result = self.pipe_img(
          prompt=prompt,
          init_image=init_image,
          strength=strength,
          num_inference_steps=steps,
          guidance_scale=scale,
          eta=eta,
          generator=generator
        )

        sample = result["sample"]
        image = sample[0]
    
    image.save(f'{file_path}.png')
    thumb = thumbnail(image)
    thumb.save(f'{file_path}_thumbnail.jpg')

    self.busy = False

    return {
      'type': "branch",
      'init_run_id': init_run_id,
      'prompt': prompt,
      'steps': steps,
      'scale': scale,
      'eta': eta,
      'seed': seed,
      'actual_seed': actual_seed,
      'strength': strength,
      'run_id': run_id
    }
