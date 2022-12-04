import torch
from diffusers import UNet2DConditionModel
import gc

class MultiUnet():
    def __init__(self, model_folder_path):
        self.model_folder_path = model_folder_path
        self.last_models = {
          'stable-diffusion-v1-5': 1
        }

        self.model = self.get_model("stable-diffusion-v1-5")

        unet_config = UNet2DConditionModel.load_config(f"{self.model_folder_path}/stable-diffusion-v1-5/unet")
        self.unet = UNet2DConditionModel.from_config(unet_config).to("cuda")
        self.load_model_into_unet()
        

    def get_model(self, model_name):
        return torch.load(
            f"{self.model_folder_path}/{model_name}/unet/diffusion_pytorch_model.bin", map_location=torch.device("cuda"))

    def load(self, models):
        scaling_factors = []
        for model in self.last_models:
          old_weight = self.last_models.get(model, 0)
          new_weight = models.get(model, 0)
          if (old_weight > 0 and new_weight > 0):
            scaling_factors.append(new_weight / old_weight)

        scaling_factor = max(set(scaling_factors), key=scaling_factors.count, default=1)
        self.last_models = {k: v * scaling_factor for k, v in self.last_models.items()}

        models_diff = models.copy()
        for model in self.last_models:
          if (model not in models_diff):
            models_diff[model] = 0
          models_diff[model] -= self.last_models[model]
        models_diff = {k: v for k, v in models_diff.items() if v != 0}

        # No changes
        if (len(models_diff) == 0):
            print("Same models")
            return self.unet

        # Faster to start from scratch
        if (len(models) <= len(models_diff)):
          # Load the biggest model
          model_path = max(models, key=models.get)
          print(f"Loading fresh {model_path}")

          del self.model

          self.model = self.get_model(model_path)

          # Calculate weight based on the one we just did
          self.last_models = {}
          self.last_models[model_path] = models[model_path]

          # The diff is invalid now, recalculate
          models_diff = models.copy()
          del models_diff[model_path]

        for path in models_diff:
            weight = models_diff[path]
            self.merge_two(path, weight)

        self.load_model_into_unet()
        return self.unet

    def merge_two(self, add_path, add_weight):
        base_weight = sum(self.last_models.values())
        total_weight = base_weight + add_weight
        base_factor = base_weight / total_weight
        add_factor = add_weight / total_weight

        percent_composition = round(100 * add_weight / (total_weight), 2)
        print(f"Adding {percent_composition}% {add_path}")

        if (add_path not in self.last_models):
          self.last_models[add_path] = 0
        self.last_models[add_path] += add_weight

        add_model = self.get_model(add_path)
        for key in self.model.keys():
            if key in add_model:
                self.model[key] = self.model[key] * base_factor + add_model[key] * add_factor
        del add_model
        gc.collect()


    def load_model_into_unet(self):
        # Convert old format to new format if needed from a PyTorch state_dict
        # copy state_dict so _load_from_state_dict can modify it
        state_dict = self.model.copy()
        error_msgs = []

        # PyTorch's `_load_from_state_dict` does not copy parameters in a module's descendants
        # so we need to apply the function recursively.
        def load(module: torch.nn.Module, prefix=""):
            args = (state_dict, prefix, {}, True, [], [], error_msgs)
            module._load_from_state_dict(*args)

            for name, child in module._modules.items():
                if child is not None:
                    load(child, prefix + name + ".")

        load(self.unet)

        return error_msgs
