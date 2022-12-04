import torch
from diffusers import UNet2DConditionModel
import gc

class MultiUnet():
    def __init__(self, model_folder_path):
        self.model_folder_path = model_folder_path

        self.slot_components = {
          0: { 'stable-diffusion-v1-5': 1 },
          1: { 'stable-diffusion-v1-5': 1 }
        }

        self.slots = {
          0: self.get_model("stable-diffusion-v1-5"),
          1: self.get_model("stable-diffusion-v1-5")
        }

        self.loaded_slot = 0

        unet_config = UNet2DConditionModel.load_config(f"{self.model_folder_path}/stable-diffusion-v1-5/unet")
        self.unet = UNet2DConditionModel.from_config(unet_config).to("cuda")
        self.load_model_into_unet()
        

    def get_model(self, model_name):
        return torch.load(
            f"{self.model_folder_path}/{model_name}/unet/diffusion_pytorch_model.bin", map_location=torch.device("cuda"))

    def calculate_component_diff(self, components, slot):
        scaling_factors = []
        for model in self.slot_components[slot]:
          old_weight = self.slot_components[slot].get(model, 0)
          new_weight = components.get(model, 0)
          if (old_weight > 0 and new_weight > 0):
            scaling_factors.append(new_weight / old_weight)

        scaling_factor = max(set(scaling_factors), key=scaling_factors.count, default=1)
        self.slot_components[slot] = {k: v * scaling_factor for k, v in self.slot_components[slot].items()}

        models_diff = components.copy()
        for model in self.slot_components[slot]:
          if (model not in models_diff):
            models_diff[model] = 0
          models_diff[model] -= self.slot_components[slot][model]
        models_diff = {k: v for k, v in models_diff.items() if abs(v) > 1e-10}
        return models_diff

    def load(self, components):
        slot_diffs = {
            0: self.calculate_component_diff(components, 0),
            1: self.calculate_component_diff(components, 1)
        }

        # Currently loaded model is correct
        if (len(slot_diffs[self.loaded_slot]) == 0):
            print("Same models")
            return self.unet

        # Other slot is correct
        if (len(slot_diffs[1 - self.loaded_slot]) == 0):
            print("Same models, other slot")
            self.loaded_slot = 1 - self.loaded_slot
            print(f"Slot {self.loaded_slot}")
            self.load_model_into_unet()
            return self.unet

        # Neither loaded slot is correct, need to mutate one
        # Mutate the LRU slot

        # If it would be faster to use the more recently used slot, copy it over the other one
        print(slot_diffs[self.loaded_slot])
        print(slot_diffs[1 - self.loaded_slot])
        if (len(slot_diffs[self.loaded_slot]) < len(slot_diffs[1 - self.loaded_slot])):
          print(f"Duplicating slot {self.loaded_slot} into both slots")
          self.slots[1 - self.loaded_slot] = self.slots[self.loaded_slot].copy()
          self.slot_components[1 - self.loaded_slot] = self.slot_components[self.loaded_slot].copy()
          slot_diffs[1 - self.loaded_slot] = slot_diffs[self.loaded_slot].copy()

        self.loaded_slot = 1 - self.loaded_slot
        component_diff = slot_diffs[self.loaded_slot]
        print(f"Slot {self.loaded_slot}")

        # Faster to start from scratch
        if (len(components) <= len(component_diff)):
          # Load the biggest model
          model_path = max(component_diff, key=component_diff.get)
          print(f"Loading fresh {model_path}")

          del self.slots[self.loaded_slot]
          self.slots[self.loaded_slot] = self.get_model(model_path)

          # Calculate weight based on the one we just did
          self.slot_components[self.loaded_slot] = {}
          self.slot_components[self.loaded_slot][model_path] = components[model_path]

          # The diff is invalid now, recalculate
          component_diff = components.copy()
          del component_diff[model_path]

        for path in component_diff:
            weight = component_diff[path]
            self.merge_two(path, weight)

        self.load_model_into_unet()
        return self.unet

    def merge_two(self, add_path, add_weight):
        base_weight = sum(self.slot_components[self.loaded_slot].values())
        total_weight = base_weight + add_weight
        base_factor = base_weight / total_weight
        add_factor = add_weight / total_weight

        percent_composition = round(100 * add_weight / (total_weight), 2)
        print(f"Adding {percent_composition}% {add_path}")

        if (add_path not in self.slot_components[self.loaded_slot]):
          self.slot_components[self.loaded_slot][add_path] = 0
        self.slot_components[self.loaded_slot][add_path] += add_weight

        add_model = self.get_model(add_path)
        for key in self.slots[self.loaded_slot].keys():
            if key in add_model:
                self.slots[self.loaded_slot][key] = self.slots[self.loaded_slot][key] * base_factor + add_model[key] * add_factor
        del add_model
        gc.collect()


    def load_model_into_unet(self):
        # Convert old format to new format if needed from a PyTorch state_dict
        # copy state_dict so _load_from_state_dict can modify it
        state_dict = self.slots[self.loaded_slot].copy()
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
