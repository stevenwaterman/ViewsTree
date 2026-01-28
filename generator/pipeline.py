import base64
import io
import re

from colors import apply_color_correction
from encoder import _encode_prompt
from multiUnet import MultiUnet
import torch

from diffusers import EulerAncestralDiscreteScheduler, DDIMScheduler, StableDiffusionPipeline, StableDiffusionImg2ImgPipeline, CycleDiffusionPipeline, StableDiffusionInpaintPipelineLegacy, AutoencoderKL, UNet2DConditionModel
from transformers import CLIPTextModel, CLIPTokenizer
from PIL import Image, ImageOps, ImageFilter, ImageChops
import uuid
import numpy as np
import os
import random

def preprocess(image):
    w, h = image.size
    # resize to integer multiple of 32
    w, h = map(lambda x: x - x % 32, (w, h))
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
    print("resizing", width, max_width, height,
          max_height, scale, new_width, new_height)

    return img.resize((new_width, new_height), Image.LANCZOS)


def random_seed():
    return random.randint(0, 2147483647)


StableDiffusionPipeline._encode_prompt = _encode_prompt
StableDiffusionImg2ImgPipeline._encode_prompt = _encode_prompt
CycleDiffusionPipeline._encode_prompt = _encode_prompt

def lockout(func):
  def inner(self, *args, **kwargs):
    if (self.busy):
      return None
    
    self.busy = True

    try:
      return func(self, *args, **kwargs)
    finally:
      self.busy = False

  return inner

class Pipeline():
    def __init__(self):
        self.busy = False

        self.model_folder = "./models"

        main_model_path = f"{self.model_folder}/stable-diffusion-v1-5"
        # self.vae = AutoencoderKL.from_pretrained(main_model_path, subfolder="vae")
        # self.tokenizer = CLIPTokenizer.from_pretrained(main_model_path, subfolder="tokenizer")
        # self.text_encoder = CLIPTextModel.from_pretrained(f"{main_model_path}/text_encoder")
        # self.eulerScheduler = EulerAncestralDiscreteScheduler.from_pretrained(main_model_path, subfolder="scheduler")
        # self.ddimScheduler = DDIMScheduler.from_pretrained(main_model_path, subfolder="scheduler")

        self.unet = MultiUnet(self.model_folder)

    @lockout
    def run_txt(self, save_name, models, prompt, negative_prompt, width, height, steps, scale, seed):
        if not os.path.exists(f"../data/{save_name}"):
            os.mkdir(f"../data/{save_name}")

        run_id = str(uuid.uuid4())
        file_path = f'../data/{save_name}/{run_id}'

        actual_seed = random_seed() if seed is None else seed
        generator = torch.cuda.manual_seed(actual_seed)

        pipe = StableDiffusionPipeline(
            vae=self.vae,
            text_encoder=self.text_encoder,
            tokenizer=self.tokenizer,
            unet=self.unet.load(models),
            scheduler=self.eulerScheduler,
            safety_checker=None,
            feature_extractor=None
        ).to("cuda")

        with torch.autocast("cuda"):
            image = pipe(
                prompt=prompt,
                negative_prompt=negative_prompt,
                width=width,
                height=height,
                num_inference_steps=steps,
                guidance_scale=scale,
                generator=generator
            ).images[0]

        image.save(f'{file_path}.png')
        thumb = thumbnail(image)
        thumb.save(f'{file_path}_thumbnail.jpg')

        return {
            'models': models,
            'prompt': prompt,
            'negative_prompt': negative_prompt,
            'width': width,
            'height': height,
            'steps': steps,
            'scale': scale,
            'seed': seed,
            'actual_seed': actual_seed,
            'run_id': run_id
        }

    @lockout
    def run_img(self, save_name, init_run_id, models, prompt, negative_prompt, steps, scale, seed, strength, color_correction_id):
        if not os.path.exists(f"../data/{save_name}"):
            os.mkdir(f"../data/{save_name}")

        run_id = str(uuid.uuid4())
        file_path = f'../data/{save_name}/{run_id}'
        init_path = f'../data/{save_name}/{init_run_id}.png'

        actual_seed = random_seed() if seed is None else seed
        generator = torch.cuda.manual_seed(actual_seed)

        init_pil = Image.open(init_path)
        init_image = preprocess(init_pil)

        pipe = StableDiffusionImg2ImgPipeline(
            vae=self.vae,
            text_encoder=self.text_encoder,
            tokenizer=self.tokenizer,
            unet=self.unet.load(models),
            scheduler=self.eulerScheduler,
            safety_checker=None,
            feature_extractor=None
        ).to("cuda")  

        with torch.autocast("cuda"):
            image = pipe(
                prompt=prompt,
                negative_prompt=negative_prompt,
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

        return {
            'init_run_id': init_run_id,
            'models': models,
            'prompt': prompt,
            'negative_prompt': negative_prompt,
            'steps': steps,
            'scale': scale,
            'seed': seed,
            'actual_seed': actual_seed,
            'strength': strength,
            'run_id': run_id
        }

    @lockout
    def run_cycle(self, save_name, init_run_id, models, source_prompt, prompt, negative_prompt, steps, scale, seed, strength, color_correction_id):
        if not os.path.exists(f"../data/{save_name}"):
            os.mkdir(f"../data/{save_name}")

        run_id = str(uuid.uuid4())
        file_path = f'../data/{save_name}/{run_id}'
        init_path = f'../data/{save_name}/{init_run_id}.png'

        actual_seed = random_seed() if seed is None else seed
        generator = torch.cuda.manual_seed(actual_seed)

        init_pil = Image.open(init_path)
        init_image = preprocess(init_pil)

        pipe = CycleDiffusionPipeline(
            vae=self.vae,
            text_encoder=self.text_encoder,
            tokenizer=self.tokenizer,
            unet=self.unet.load(models),
            scheduler=self.ddimScheduler,
            safety_checker=None,
            feature_extractor=None
        ).to("cuda")

        with torch.autocast("cuda"):
            image = pipe(
                prompt=prompt,
                source_prompt=source_prompt,
                init_image=init_image,
                strength=strength,
                num_inference_steps=steps,
                guidance_scale=scale,
                source_guidance_scale=1,
                eta=0.1,
                generator=generator
            ).images[0]

        if color_correction_id is not None:
            reference_path = f'../data/{save_name}/{color_correction_id}.png'
            reference_image = Image.open(reference_path)
            image = apply_color_correction(image, [reference_image])

        image.save(f'{file_path}.png')
        thumb = thumbnail(image)
        thumb.save(f'{file_path}_thumbnail.jpg')

        return {
            'init_run_id': init_run_id,
            'models': models,
            'source_prompt': source_prompt,
            'prompt': prompt,
            'negative_prompt': negative_prompt,
            'steps': steps,
            'scale': scale,
            'seed': seed,
            'actual_seed': actual_seed,
            'strength': strength,
            'run_id': run_id
        }
    
    @lockout
    def run_inpaint(self, save_name, init_run_id, mask_run_id, models, prompt, negative_prompt, steps, scale, seed, strength, color_correction_id):
        if not os.path.exists(f"../data/{save_name}"):
            os.mkdir(f"../data/{save_name}")

        run_id = str(uuid.uuid4())
        file_path = f'../data/{save_name}/{run_id}'
        init_path = f'../data/{save_name}/{init_run_id}.png'
        mask_path = f'../data/{save_name}/{mask_run_id}.png'

        actual_seed = random_seed() if seed is None else seed
        generator = torch.cuda.manual_seed(actual_seed)

        init_pil = Image.open(init_path)

        mask_pil = Image.open(mask_path).convert("RGB")
        blur_radius = min(mask_pil.size)/200
        for _ in range(5):
            blurred = mask_pil.filter(ImageFilter.GaussianBlur(blur_radius))
            mask_pil = ImageChops.darker(mask_pil, blurred)
            mask_pil = mask_pil.point(lambda i: 255 if i == 255 else i * 0.5 - 1)
        mask_pil = mask_pil.filter(ImageFilter.GaussianBlur(blur_radius))
        mask_pil = ImageOps.invert(mask_pil)

        pipe = StableDiffusionInpaintPipelineLegacy(
            vae=self.vae,
            text_encoder=self.text_encoder,
            tokenizer=self.tokenizer,
            unet=self.unet.load(models),
            scheduler=self.ddimScheduler,
            safety_checker=None,
            feature_extractor=None
        ).to("cuda")

        with torch.autocast("cuda"):
            image = pipe(
                prompt=prompt,
                negative_prompt=negative_prompt,
                init_image=init_pil,
                mask_image=mask_pil,
                strength=strength,
                num_inference_steps=steps,
                guidance_scale=scale,
                generator=generator
            ).images[0]

        image = Image.composite(image, init_pil, mask_pil.convert("L"))

        if color_correction_id is not None:
            reference_path = f'../data/{save_name}/{color_correction_id}.png'
            reference_image = Image.open(reference_path)
            image = apply_color_correction(image, [reference_image])

        image.save(f'{file_path}.png')
        thumb = thumbnail(image)
        thumb.save(f'{file_path}_thumbnail.jpg')

        return {
            'init_run_id': init_run_id,
            'models': models,
            'prompt': prompt,
            'negative_prompt': negative_prompt,
            'steps': steps,
            'scale': scale,
            'seed': seed,
            'actual_seed': actual_seed,
            'strength': strength,
            'run_id': run_id
        }

    def run_upload(self, save_name, image, crop, width, height):
        if not os.path.exists(f"../data/{save_name}"):
            os.mkdir(f"../data/{save_name}")

        run_id = str(uuid.uuid4())
        file_path = f'../data/{save_name}/{run_id}'

        image = re.sub('^data:image/.+;base64,', '', image)
        decodedImage = Image.open(io.BytesIO(
            base64.decodebytes(bytes(image, "utf-8")))).convert("RGB")
        croppedImage = decodedImage.crop((
            crop["left"],
            crop["top"],
            crop["right"],
            crop["bottom"]
        ))
        resizedImage = croppedImage.resize((width, height), Image.LANCZOS)

        resizedImage.save(f'{file_path}.png')
        thumb = thumbnail(resizedImage)
        thumb.save(f'{file_path}_thumbnail.jpg')

        return {
            'width': width,
            'height': height,
            'run_id': run_id
        }

    def models(self):
        return [f.name for f in os.scandir(self.model_folder) if f.is_dir()]
