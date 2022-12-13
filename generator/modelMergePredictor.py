import torch
from torch import nn
from random import random

possible_weights = range(101)
class ModelMergeNetwork(nn.Module):
  def __init__(self, model_names):
    self.model_names = model_names

    super(ModelMergeNetwork, self).__init__()
    self.linear_stack = nn.Sequential(
      nn.Linear(len(model_names) * 2, len(model_names)*10),
      nn.ReLU(),
      nn.Linear(len(model_names)*10, len(model_names)*5),
      nn.ReLU(),
      nn.Linear(len(model_names)*5, len(model_names)),
      nn.ReLU(),
      nn.Linear(len(model_names), 1)
    ).to("cuda")

    self.training_data = []
    self.optimizer = torch.optim.Adam(self.parameters(), lr=0.1)
    self.loss_fn = nn.MSELoss()
    # self.init_draws()

  def init_draws(self):
    optimizer = torch.optim.Adam(self.parameters(), lr=0.05)
    outputs = torch.tensor([0.5], dtype=torch.float).to("cuda")
    print("starting init")

    for _ in range(20):
      random_inputs = [random() for _ in self.model_names]
      input_sum = sum(random_inputs)
      scaled_inputs = [x / input_sum for x in random_inputs]
      inputs = torch.tensor(scaled_inputs + scaled_inputs, dtype=torch.float).to("cuda")
      self._train(inputs, outputs, optimizer)

    print("ending init")

  def forward(self, x):
    return self.linear_stack(x)

  def train(self, current_models, mutation, score):
    current_inputs = []
    candidate_inputs = []
    for model in self.model_names:
      current_inputs.append(current_models.get(model, 0))

      if (model == mutation["model"]):
        candidate_inputs.append(mutation["weight"])
      else:
        candidate_inputs.append(current_inputs[-1])

    current_sum = sum(current_inputs)
    scaled_current = [x / current_sum for x in current_inputs]

    candidate_sum = sum(candidate_inputs)
    scaled_candidate = [input / candidate_sum for input in candidate_inputs]

    inputs = torch.tensor(scaled_current + scaled_candidate, dtype=torch.float).to("cuda")
    outputs = torch.tensor([score], dtype=torch.float).to("cuda")
    self.training_data.append((inputs, outputs))
    self._train(inputs, outputs, self.optimizer)

    inputs_reverse = torch.tensor(scaled_candidate + scaled_current, dtype=torch.float).to("cuda")
    outputs_reverse = torch.tensor([1-score], dtype=torch.float).to("cuda")
    self.training_data.append((inputs_reverse, outputs_reverse))
    self._train(inputs_reverse, outputs_reverse, self.optimizer)

  def _train(self, inputs, outputs, optimizer):
    pred = self(inputs)
    loss = self.loss_fn(pred, outputs)
    print(loss.item())
    
    optimizer.zero_grad()
    loss.backward()
    optimizer.step()

    return loss.item()

  def mutationScores(self, current_models):
    current_inputs = []
    for model in self.model_names:
      current_inputs.append(current_models.get(model, 0))

    current_sum = sum(current_inputs)
    scaled_current_inputs = [x / current_sum for x in current_inputs]

    mutations = {}
    for model in self.model_names:
      mutations[model] = []
      for weight in possible_weights:
        idx = self.model_names.index(model)

        candidate_inputs = current_inputs.copy()
        candidate_inputs[idx] = weight
        candidate_sum = current_sum - current_inputs[idx] + candidate_inputs[idx]
        scaled_candidate_inputs = [x / candidate_sum for x in candidate_inputs]
        inputs = torch.tensor(scaled_current_inputs + scaled_candidate_inputs, dtype=torch.float).to("cuda")
        pred_score = self(inputs).item()
        mutations[model].append(pred_score)

    return mutations

