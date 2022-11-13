import os
from pipeline import Pipeline
from flask import Flask, request, send_from_directory
from flask_cors import CORS
from PIL import Image


if not os.path.exists("../data"):
    os.mkdir("../data")

pipe = Pipeline()
app = Flask(__name__)
app.config["UPLOAD_FOLDER"] = "../data"
CORS(app)

@app.route("/<string:save_name>/txtimg", methods=["POST"])
def txtimg(save_name):
  json = request.get_json(force=True)

  prompt = json.get("prompt", None)
  if prompt is None:
    raise "Prompt is required"

  models = json.get("models", None)
  if models is None:
    raise "Models are required"

  config = pipe.run_txt(
    save_name = save_name,
    models = models,
    prompt = prompt,

    width = json.get("width", 512),
    height = json.get("height", 512),
    steps = json.get("steps", 50),
    scale = json.get("scale", 8),
    seed = json.get("seed", None)
  )

  if config is None:
    return "busy", 429

  print("Generated", config)
  return config

@app.route("/<string:save_name>/imgimg/<uuid:init_run_id>", methods=["POST"])
def imgimg(save_name, init_run_id):
  json = request.get_json(force=True)

  prompt = json.get("prompt", None)
  if prompt is None:
    raise "Prompt is required"

  models = json.get("models", None)
  if models is None:
    raise "Models are required"

  config = pipe.run_img(
    save_name = save_name,
    init_run_id = init_run_id,
    models = models,
    prompt = prompt,

    steps = json.get("steps", 50),
    scale = json.get("scale", 8), 
    seed = json.get("seed", None),
    strength = json.get("strength", 0.4),
    color_correction_id = json.get("colorCorrectionId", None)
  )

  if config is None:
    return "busy", 429

  print("Refined", config)
  return config
  
@app.route("/<string:save_name>/imgcycle/<uuid:init_run_id>", methods=["POST"])
def imgcycle(save_name, init_run_id):
  json = request.get_json(force=True)

  models = json.get("models", None)
  if models is None:
    raise "Models are required"

  source_prompt = json.get("sourcePrompt", None)
  if source_prompt is None:
    raise "Source Prompt is required"

  prompt = json.get("prompt", None)
  if prompt is None:
    raise "Prompt is required"

  config = pipe.run_cycle(
    save_name = save_name,
    init_run_id = init_run_id,
    models = models,
    source_prompt = source_prompt,
    prompt = prompt,

    steps = json.get("steps", 50),
    scale = json.get("scale", 8), 
    seed = json.get("seed", None),
    strength = json.get("strength", 0.4),
    color_correction_id = json.get("colorCorrectionId", None)
  )

  if config is None:
    return "busy", 429

  print("Cycled", config)
  return config

@app.route("/<string:save_name>/upload", methods=["POST"])
def upload(save_name):
  json = request.get_json(force=True)

  image = json.get("image", None)
  if image is None:
    raise "Image is required"

  crop = json.get("crop", None)
  if crop is None:
    raise "Crop is required"

  config = pipe.run_upload(
    save_name = save_name,
    image = image,
    crop = crop,
    width = json.get("width", 512),
    height = json.get("height", 512)
  )

  if config is None:
    return "busy", 429

  print("Uploaded", config)
  return config

@app.route("/<string:save_name>/image/<uuid:run_id>", methods=["GET"])
def image(save_name, run_id):
  return send_from_directory(f"../data/{save_name}", f"{run_id}.png")

@app.route("/<string:save_name>/thumb/<uuid:run_id>", methods=["GET"])
def thumb(save_name, run_id):
  return send_from_directory(f"../data/{save_name}", f"{run_id}_thumbnail.jpg")

@app.route("/models", methods=["GET"])
def models():
  return pipe.models()
  