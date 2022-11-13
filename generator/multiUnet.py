from dataclasses import dataclass
from typing import List, Tuple
from diffusers import UNet2DConditionModel
from itertools import groupby
import torch

def flatten(l):
    return [item for sublist in l for item in sublist]

def all_equal(iterable):
    g = groupby(iterable)
    return next(g, True) and not next(g, False)

@dataclass
class UNet2DConditionOutput():
    sample: torch.FloatTensor

class MultiUnet():
  def __init__(
    self,
    underlying: List[Tuple[UNet2DConditionModel, float]],
    device
  ):
    underlying = [pair for pair in underlying if pair[1] > 0]
    self.unets = [pair[0] for pair in underlying]

    for unet in self.unets:
      unet.to(device)

    if (len(underlying) == 0):
      raise "No models passed to MultiUnet"

    in_channels = [unet.in_channels for unet in self.unets]
    self.in_channels = in_channels[0]
    if (not all_equal(in_channels)):
      raise f"MultiUnet unets must all be same size. in_channels: {str(in_channels)}"

    weights = [pair[1] for pair in underlying]
    weight_sum = sum(weights)
    self.weights = [weight / weight_sum for weight in weights]
  
  def set_use_memory_efficient_attention_xformers(self, value):
    for unet in self.unets:
      unet.set_use_memory_efficient_attention_xformers(value)

  def modules(self):
    all_modules = [unet.modules() for unet in self.unets]
    return flatten(all_modules)

  def __call__(
    self,
    latent_model_input,
    t,
    encoder_hidden_states
  ):
    noise_preds = [unet(latent_model_input, t, encoder_hidden_states).sample for unet in self.unets]
    output = torch.zeros_like(noise_preds[0])

    for pair in zip(noise_preds, self.weights):
      noise_pred = pair[0]
      weight = pair[1]
      output.add_(noise_pred, alpha=weight)

    return UNet2DConditionOutput(sample=output)