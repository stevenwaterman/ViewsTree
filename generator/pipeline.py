import base64
import io
import re
from colors import apply_color_correction
from encoder import _encode_prompt
import torch

from diffusers import EulerAncestralDiscreteScheduler, LMSDiscreteScheduler, StableDiffusionPipeline, StableDiffusionImg2ImgPipeline, CycleDiffusionPipeline
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
  return random.randint(0,2147483647)

StableDiffusionPipeline._encode_prompt = _encode_prompt
StableDiffusionImg2ImgPipeline._encode_prompt = _encode_prompt
CycleDiffusionPipeline._encode_prompt = _encode_prompt

# TODO maybe let people control this, eg only load one model at a time
class Pipeline():
  def __init__(self):
    self.busy = False

    eulerScheduler = EulerAncestralDiscreteScheduler.from_config("./stable-diffusion-v1-5", subfolder="scheduler")
    self.pipe_txt = StableDiffusionPipeline.from_pretrained(
        "./stable-diffusion-v1-5", 
        scheduler=eulerScheduler,
        revision="fp16",
        torch_dtype=torch.float16
    ).to("cuda")
    self.pipe_txt.safety_checker = lambda images, **kwargs: (images, False)

    self.pipe_img = StableDiffusionImg2ImgPipeline.from_pretrained(
        "./stable-diffusion-v1-5", 
        scheduler=eulerScheduler,
        revision="fp16",
        torch_dtype=torch.float16
    ).to("cuda")
    self.pipe_img.safety_checker = lambda images, **kwargs: (images, False)

    lmsScheduler = LMSDiscreteScheduler.from_config("./stable-diffusion-v1-5", subfolder="scheduler")
    self.pipe_cycle = CycleDiffusionPipeline.from_pretrained(
        "./stable-diffusion-v1-5", 
        scheduler=lmsScheduler,
        revision="fp16",
        torch_dtype=torch.float16
    ).to("cuda")
    self.pipe_cycle.safety_checker = lambda images, **kwargs: (images, False)

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
        image = self.pipe_txt(
          prompt=prompt,
          width=width,
          height=height,
          num_inference_steps=steps,
          guidance_scale=scale,
          generator=generator
        ).images[0]
    
    image.save(f'{file_path}.png')
    thumb = thumbnail(image)
    thumb.save(f'{file_path}_thumbnail.jpg')

    self.busy = False

    return {
      'prompt': prompt,
      'width': width,
      'height': height,
      'steps': steps,
      'scale': scale,
      'seed': seed,
      'actual_seed': actual_seed,
      'run_id': run_id
    }

  def run_img(self, save_name, init_run_id, prompt, steps, scale, seed, strength, color_correction_id):
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

    init_pil = Image.open(init_path)
    init_image = preprocess(init_pil)

    with torch.autocast("cuda"):
        image = self.pipe_img(
          prompt=prompt,
          init_image=init_image,
          strength=strength,
          num_inference_steps=steps,
          guidance_scale=scale,
          generator=generator
        ).images[0]

    if color_correction_id is not None:
      reference_path = f'../data/{save_name}/{color_correction_id}.png'
      reference_image = Image.open(reference_path)
      image = apply_color_correction(image, [reference_image])
    
    image.save(f'{file_path}.png')
    thumb = thumbnail(image)
    thumb.save(f'{file_path}_thumbnail.jpg')

    self.busy = False

    return {
      'init_run_id': init_run_id,
      'prompt': prompt,
      'steps': steps,
      'scale': scale,
      'seed': seed,
      'actual_seed': actual_seed,
      'strength': strength,
      'run_id': run_id
    }

  def run_cycle(self, save_name, init_run_id, source_prompt, prompt, steps, scale, seed, strength, color_correction_id):
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

    init_pil = Image.open(init_path)
    init_image = preprocess(init_pil)

    with torch.autocast("cuda"):
        image = self.pipe_img(
          prompt=prompt,
          source_prompt=source_prompt,
          init_image=init_image,
          strength=strength,
          num_inference_steps=steps,
          guidance_scale=scale / 2.5,
          source_guidance_scale=1,
          generator=generator
        ).images[0]

    if color_correction_id is not None:
      reference_path = f'../data/{save_name}/{color_correction_id}.png'
      reference_image = Image.open(reference_path)
      image = apply_color_correction(image, [reference_image])
    
    image.save(f'{file_path}.png')
    thumb = thumbnail(image)
    thumb.save(f'{file_path}_thumbnail.jpg')

    self.busy = False

    return {
      'init_run_id': init_run_id,
      'source_prompt': source_prompt ,
      'prompt': prompt,
      'steps': steps,
      'scale': scale,
      'seed': seed,
      'actual_seed': actual_seed,
      'strength': strength,
      'run_id': run_id
    }

  def run_upload(self, save_name, image, crop, width, height):
    if self.busy:
      return None

    self.busy = True

    if not os.path.exists(f"../data/{save_name}"):
      os.mkdir(f"../data/{save_name}")

    run_id = str(uuid.uuid4())
    file_path = f'../data/{save_name}/{run_id}'

    image = re.sub('^data:image/.+;base64,', '', image)
    decodedImage = Image.open(io.BytesIO(base64.decodebytes(bytes(image, "utf-8")))).convert("RGB")
    croppedImage = decodedImage.crop((
      crop["left"],
      crop["top"],
      crop["right"],
      crop["bottom"]
    ))
    resizedImage = croppedImage.resize((width, height), Image.ANTIALIAS)

    resizedImage.save(f'{file_path}.png')
    thumb = thumbnail(resizedImage)
    thumb.save(f'{file_path}_thumbnail.jpg')

    self.busy = False

    return {
      'width': width,
      'height': height,
      'run_id': run_id
    }
