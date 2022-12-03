import torch
from diffusers import UNet2DConditionModel
from copy import deepcopy


class MultiUnet():
    def __init__(self, model_folder_path):
        self.model_folder_path = model_folder_path
        self.last_unet = None
        self.last_models = None

    def get_model(self, model_name):
        return torch.load(
            f"{self.model_folder_path}/{model_name}/unet/diffusion_pytorch_model.bin", map_location="cpu")

    def load(self, models):
        models = {k: v for k, v in models.items() if v > 0}

        # If same models as last time, reuse loaded unet
        if (models == self.last_models):
            print("Reusing unet")
            return self.last_unet

        base_model_path = max(models, key=models.get)
        base_model = self.get_model(base_model_path)

        self.last_models = models
        unet_config = UNet2DConditionModel.load_config(f"{self.model_folder_path}/stable-diffusion-v1-5/unet")
        self.last_unet = UNet2DConditionModel.from_config(unet_config).to("cuda")

        if (len(models) == 1):
            # If only one model, don't bother merging or anything
            print("Only one model, loading single unet")
            load_state_dict_into_model(self.last_unet, base_model)
        else:
            print("Merging unets")
            model_a = deepcopy(base_model)
            weight_a = models[base_model_path]

            for path_b in models:
                weight_b = models[path_b]
                if (path_b != base_model_path and weight_b > 0):
                    model_a = self.merge_two(
                        model_a, weight_a, path_b, weight_b)
                    weight_a += weight_b
            load_state_dict_into_model(self.last_unet, model_a)

        return self.last_unet

    def merge_two(self, model_a, weight_a, path_b, weight_b):
        print("merging " + path_b)
        model_b = self.get_model(path_b)

        total_weight = weight_a + weight_b
        factor_a = weight_a / total_weight
        factor_b = weight_b / total_weight

        for key in model_a.keys():
            if key in model_b:
                model_a[key] = model_a[key] * \
                    factor_a + model_b[key] * factor_b
        del model_b
        return model_a


def load_state_dict_into_model(model_to_load, state_dict):
    # Convert old format to new format if needed from a PyTorch state_dict
    # copy state_dict so _load_from_state_dict can modify it
    state_dict = state_dict.copy()
    error_msgs = []

    # PyTorch's `_load_from_state_dict` does not copy parameters in a module's descendants
    # so we need to apply the function recursively.
    def load(module: torch.nn.Module, prefix=""):
        args = (state_dict, prefix, {}, True, [], [], error_msgs)
        module._load_from_state_dict(*args)

        for name, child in module._modules.items():
            if child is not None:
                load(child, prefix + name + ".")

    load(model_to_load)

    return error_msgs
