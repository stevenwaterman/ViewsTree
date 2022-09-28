import os
from pipeline import Pipeline
from flask import Flask, request, send_from_directory
from flask_cors import CORS


if not os.path.exists("../data"):
    os.mkdir("../data")

pipe = Pipeline()
app = Flask(__name__)
CORS(app)

@app.route("/<string:save_name>/root", methods=["POST"])
def root(save_name):
  json = request.get_json(force=True)

  prompt = json.get("prompt", None)
  if prompt is None:
    raise "Prompt is required"

  config = pipe.run_txt(
    save_name = save_name,
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

@app.route("/<string:save_name>/branch/<uuid:init_run_id>", methods=["POST"])
def branch(save_name, init_run_id):
  json = request.get_json(force=True)

  prompt = json.get("prompt", None)
  if prompt is None:
    raise "Prompt is required"

  config = pipe.run_img(
    save_name = save_name,
    init_run_id = init_run_id,
    prompt = prompt,

    steps = json.get("steps", 50),
    scale = json.get("scale", 8), 
    eta = json.get("eta", 0),
    seed = json.get("seed", None),
    strength = json.get("strength", 0.4)
  )

  if config is None:
    return "busy", 429

  print("Refined", config)
  return config

@app.route("/<string:save_name>/image/<uuid:run_id>", methods=["GET"])
def image(save_name, run_id):
  return send_from_directory(f"../data/{save_name}", f"{run_id}.png")

@app.route("/<string:save_name>/thumb/<uuid:run_id>", methods=["GET"])
def thumb(save_name, run_id):
  return send_from_directory(f"../data/{save_name}", f"{run_id}_thumbnail.jpg")
  