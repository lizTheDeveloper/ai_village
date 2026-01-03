#!/bin/bash
cd "$(dirname "$0")/.."
source .env

curl -X POST 'https://api.pixellab.ai/v1/generate-image-pixflux' \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $PIXELLAB_API_KEY" \
  -d '{
  "description": "test grass pixel art top-down view",
  "image_size": {
    "height": 32,
    "width": 32
  },
  "no_background": true
}'
