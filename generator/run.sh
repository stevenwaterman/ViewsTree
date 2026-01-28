#!/bin/bash
cd "$(dirname "$0")"
./venv/bin/flask --app server run -h localhost -p 5001
