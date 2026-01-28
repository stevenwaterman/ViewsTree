import base64
import io
import re
import torch
import uuid
import numpy as np
import os
import random

from PIL import Image, ImageOps, ImageFilter, ImageChops
from diffusers import (
    StableDiffusionPipeline, 
    StableDiffusionImg2ImgPipeline, 
    StableDiffusionInpaintPipeline,
    EulerAncestralDiscreteScheduler,
    DDIMScheduler
)
from colors import apply_color_correction

def preprocess(image):
    w, h = image.size
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
    width, height = img.size
    scale = min(max_width / width, max_height / height)
    new_width = round(width * scale)
    new_height = round(height * scale)
    return img.resize((new_width, new_height), Image.LANCZOS)

def random_seed():
    return random.randint(0, 2147483647)

def lockout(func):
    def inner(self, *args, **kwargs):
        if self.busy:
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
        self.model_path = os.path.abspath("./models/checkpoints/v1-5-pruned-emaonly.safetensors")
        
        print(f"Loading model from {self.model_path}...")
        # Load the base pipeline
        self.pipe = StableDiffusionPipeline.from_single_file(
            self.model_path,
            torch_dtype=torch.float16,
            use_safetensors=True
        ).to("cuda")
        
        # We can reuse components for other pipeline types
        self.img_pipe = StableDiffusionImg2ImgPipeline(**self.pipe.components)
        self.inpaint_pipe = StableDiffusionInpaintPipeline(**self.pipe.components)
        
        # Set schedulers
        self.pipe.scheduler = EulerAncestralDiscreteScheduler.from_config(self.pipe.scheduler.config)
        self.img_pipe.scheduler = EulerAncestralDiscreteScheduler.from_config(self.img_pipe.scheduler.config)
        self.inpaint_pipe.scheduler = DDIMScheduler.from_config(self.pipe.scheduler.config)

    @lockout
    def run_txt(self, save_name, models, prompt, negative_prompt, width, height, steps, scale, seed):
        if not os.path.exists(f"../data/{save_name}"):
            os.mkdir(f"../data/{save_name}")

        run_id = str(uuid.uuid4())
        file_path = f'../data/{save_name}/{run_id}'

        actual_seed = random_seed() if seed is None else seed
        generator = torch.Generator("cuda").manual_seed(actual_seed)

        with torch.autocast("cuda"):
            image = self.pipe(
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
        generator = torch.Generator("cuda").manual_seed(actual_seed)

        init_pil = Image.open(init_path).convert("RGB")

        with torch.autocast("cuda"):
            image = self.img_pipe(
                prompt=prompt,
                negative_prompt=negative_prompt,
                image=init_pil,
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
    def run_inpaint(self, save_name, init_run_id, mask_run_id, models, prompt, negative_prompt, steps, scale, seed, strength, color_correction_id):
        if not os.path.exists(f"../data/{save_name}"):
            os.mkdir(f"../data/{save_name}")

        run_id = str(uuid.uuid4())
        file_path = f'../data/{save_name}/{run_id}'
        init_path = f'../data/{save_name}/{init_run_id}.png'
        mask_path = f'../data/{save_name}/{mask_run_id}.png'

        actual_seed = random_seed() if seed is None else seed
        generator = torch.Generator("cuda").manual_seed(actual_seed)

        init_pil = Image.open(init_path).convert("RGB")
        mask_pil = Image.open(mask_path).convert("RGB")
        
        # Basic mask preprocessing (keeping original logic style but simplified)
        blur_radius = min(mask_pil.size)/200
        for _ in range(5):
            blurred = mask_pil.filter(ImageFilter.GaussianBlur(blur_radius))
            mask_pil = ImageChops.darker(mask_pil, blurred)
            mask_pil = mask_pil.point(lambda i: 255 if i == 255 else i * 0.5 - 1)
        mask_pil = mask_pil.filter(ImageFilter.GaussianBlur(blur_radius))
        mask_pil = ImageOps.invert(mask_pil)

        with torch.autocast("cuda"):
            image = self.inpaint_pipe(
                prompt=prompt,
                negative_prompt=negative_prompt,
                image=init_pil,
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
        return ["v1-5-pruned-emaonly"]