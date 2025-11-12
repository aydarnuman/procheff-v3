#!/bin/bash

# Test deep-analysis endpoint
curl -X POST http://localhost:3001/api/ai/deep-analysis \
  -H "Content-Type: application/json" \
  -d '{
    "extracted_data": {
      "kurum": "MEB",
      "ihale_turu": "Yemek",
      "butce": "500000"
    }
  }'
