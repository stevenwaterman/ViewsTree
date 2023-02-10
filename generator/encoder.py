import math
import re
from typing import List
import torch

re_attention = re.compile(r"""
\\\(|
\\\)|
\\\[|
\\]|
\\\\|
\\|
\(|
\[|
:([+-]?[.\d]+)\)|
\)|
]|
[^\\()\[\]:]+|
:
""", re.X)

def parse_prompt_attention(text):
    """
    Parses a string with attention tokens and returns a list of pairs: text and its associated weight.
    Accepted tokens are:
      (abc) - increases attention to abc by a multiplier of 1.1
      (abc:3.12) - increases attention to abc by a multiplier of 3.12
      [abc] - decreases attention to abc by a multiplier of 1.1
      \( - literal character '('
      \[ - literal character '['
      \) - literal character ')'
      \] - literal character ']'
      \\ - literal character '\'
      anything else - just text

    >>> parse_prompt_attention('normal text')
    [['normal text', 1.0]]
    >>> parse_prompt_attention('an (important) word')
    [['an ', 1.0], ['important', 1.1], [' word', 1.0]]
    >>> parse_prompt_attention('(unbalanced')
    [['unbalanced', 1.1]]
    >>> parse_prompt_attention('\(literal\]')
    [['(literal]', 1.0]]
    >>> parse_prompt_attention('(unnecessary)(parens)')
    [['unnecessaryparens', 1.1]]
    >>> parse_prompt_attention('a (((house:1.3)) [on] a (hill:0.5), sun, (((sky))).')
    [['a ', 1.0],
     ['house', 1.5730000000000004],
     [' ', 1.1],
     ['on', 1.0],
     [' a ', 1.1],
     ['hill', 0.55],
     [', sun, ', 1.1],
     ['sky', 1.4641000000000006],
     ['.', 1.1]]
    """

    res = []
    round_brackets = []
    square_brackets = []

    round_bracket_multiplier = 1.1
    square_bracket_multiplier = 1 / 1.1

    def multiply_range(start_position, multiplier):
        for p in range(start_position, len(res)):
            res[p][1] *= multiplier

    for m in re_attention.finditer(text):
        text = m.group(0)
        weight = m.group(1)

        if text.startswith('\\'):
            res.append([text[1:], 1.0])
        elif text == '(':
            round_brackets.append(len(res))
        elif text == '[':
            square_brackets.append(len(res))
        elif weight is not None and len(round_brackets) > 0:
            multiply_range(round_brackets.pop(), float(weight))
        elif text == ')' and len(round_brackets) > 0:
            multiply_range(round_brackets.pop(), round_bracket_multiplier)
        elif text == ']' and len(square_brackets) > 0:
            multiply_range(square_brackets.pop(), square_bracket_multiplier)
        else:
            res.append([text, 1.0])

    for pos in round_brackets:
        multiply_range(pos, round_bracket_multiplier)

    for pos in square_brackets:
        multiply_range(pos, square_bracket_multiplier)

    if len(res) == 0:
        res = [["", 1.0]]

    # merge runs of identical weights
    i = 0
    while i + 1 < len(res):
        if res[i][1] == res[i + 1][1]:
            res[i][0] += res[i + 1][0]
            res.pop(i + 1)
        else:
            i += 1

    print(res)
    return res

def get_target_prompt_token_count(token_count):
    return math.ceil(max(token_count, 1) / 75) * 75

def tokenize_line(text, tokenizer):
  parsed = parse_prompt_attention(text)

  tokenized = tokenizer([text for text, _ in parsed], truncation=False, add_special_tokens=False)["input_ids"]

  remade_tokens: List[int] = []
  multipliers: List[float] = []

  for tokens, (text, weight) in zip(tokenized, parsed):
      i = 0
      while i < len(tokens):
          token = tokens[i]

          remade_tokens.append(token)
          multipliers.append(weight)
          i += 1

  token_count = len(remade_tokens)
  prompt_target_length = get_target_prompt_token_count(token_count)
  tokens_to_add = prompt_target_length - len(remade_tokens)

  id_end = tokenizer.eos_token_id
  remade_tokens = remade_tokens + [id_end] * tokens_to_add
  multipliers = multipliers + [1.0] * tokens_to_add

  return remade_tokens, multipliers

def make_embedding(text, tokenizer, transformer):
  remade_tokens, remade_multipliers = tokenize_line(text, tokenizer)

  remade_batch_tokens = [remade_tokens]
  batch_multipliers = [remade_multipliers]

  z = None
  i = 0
  while max(map(len, remade_batch_tokens)) != 0:
      rem_tokens = [x[75:] for x in remade_batch_tokens]
      rem_multipliers = [x[75:] for x in batch_multipliers]

      tokens = []
      multipliers = []
      for j in range(len(remade_batch_tokens)):
          if len(remade_batch_tokens[j]) > 0:
              tokens.append(remade_batch_tokens[j][:75])
              multipliers.append(batch_multipliers[j][:75])
          else:
              tokens.append([tokenizer.eos_token_id] * 75)
              multipliers.append([1.0] * 75)

      z1 = process_tokens(tokens, multipliers, tokenizer, transformer)
      z = z1 if z is None else torch.cat((z, z1), axis=-2)

      remade_batch_tokens = rem_tokens
      batch_multipliers = rem_multipliers
      i += 1

  return z

def process_tokens(remade_batch_tokens, batch_multipliers, tokenizer, transformer):
  remade_batch_tokens = [[tokenizer.bos_token_id] + x[:75] + [tokenizer.eos_token_id] for x in remade_batch_tokens]
  batch_multipliers = [[1.0] + x[:75] + [1.0] for x in batch_multipliers]

  tokens = torch.asarray(remade_batch_tokens).to("cuda")
  outputs = transformer(input_ids=tokens, output_hidden_states=0)

  z = outputs.last_hidden_state

  # restoring original mean is likely not correct, but it seems to work well to prevent artifacts that happen otherwise
  batch_multipliers_of_same_length = [x + [1.0] * (75 - len(x)) for x in batch_multipliers]
  batch_multipliers = torch.asarray(batch_multipliers_of_same_length).to("cuda")
  original_mean = z.mean()
  z *= batch_multipliers.reshape(batch_multipliers.shape + (1,)).expand(z.shape)
  new_mean = z.mean()
  z *= original_mean / new_mean

  return z

def _encode_prompt(self, prompt, device, num_images_per_prompt, do_classifier_free_guidance, negative_prompt, prompt_embeds, negative_prompt_embeds):
  r"""
  Encodes the prompt into text encoder hidden states.
  Args:
      prompt (`str` or `list(int)`):
          prompt to be encoded
      device: (`torch.device`):
          torch device
      num_images_per_prompt (`int`):
          number of images that should be generated per prompt
      do_classifier_free_guidance (`bool`):
          whether to use classifier free guidance or not
      negative_prompt (`str` or `List[str]`):
          The prompt or prompts not to guide the image generation. Ignored when not using guidance (i.e., ignored
          if `guidance_scale` is less than `1`).
  """
  batch_size = len(prompt) if isinstance(prompt, list) else 1

  # text_inputs = self.tokenizer(
  #     prompt,
  #     padding="max_length",
  #     max_length=self.tokenizer.model_max_length,
  #     return_tensors="pt",
  # )
  # text_input_ids = text_inputs.input_ids

  # if text_input_ids.shape[-1] > self.tokenizer.model_max_length:
  #     removed_text = self.tokenizer.batch_decode(text_input_ids[:, self.tokenizer.model_max_length :])
  #     logger.warning(
  #         "The following part of your input was truncated because CLIP can only handle sequences up to"
  #         f" {self.tokenizer.model_max_length} tokens: {removed_text}"
  #     )
  #     text_input_ids = text_input_ids[:, : self.tokenizer.model_max_length]
  # text_embeddings = self.text_encoder(text_input_ids.to(device))[0]
  text_embeddings = make_embedding(prompt, self.tokenizer, self.text_encoder)

  # duplicate text embeddings for each generation per prompt, using mps friendly method
  bs_embed, seq_len, _ = text_embeddings.shape
  text_embeddings = text_embeddings.repeat(1, num_images_per_prompt, 1)
  text_embeddings = text_embeddings.view(bs_embed * num_images_per_prompt, seq_len, -1)

  # get unconditional embeddings for classifier free guidance
  if do_classifier_free_guidance:
    if (negative_prompt is None):
      negative_prompt = ""
    uncond_embeddings = make_embedding(negative_prompt, self.tokenizer, self.text_encoder)

    # duplicate unconditional embeddings for each generation per prompt, using mps friendly method
    seq_len = uncond_embeddings.shape[1]
    uncond_embeddings = uncond_embeddings.repeat(1, num_images_per_prompt, 1)
    uncond_embeddings = uncond_embeddings.view(batch_size * num_images_per_prompt, seq_len, -1)

    # For classifier free guidance, we need to do two forward passes.
    # Here we concatenate the unconditional and text embeddings into a single batch
    # to avoid doing two forward passes
    text_embeddings = torch.cat([uncond_embeddings, text_embeddings])

  return text_embeddings
