import os
import requests
import logging
from typing import Optional

logger = logging.getLogger(__name__)

class ImageService:
    def __init__(self):
        self.api_key = os.environ.get("ARK_API_KEY")
        self.api_url = "https://ark.cn-beijing.volces.com/api/v3/images/generations"

    def generate_image(self, prompt: str, image_url: Optional[str] = None) -> str:
        if not self.api_key:
            raise Exception("ARK_API_KEY not found")

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }

        payload = {
            "model": "doubao-seedream-4-5-251128",
            "prompt": prompt,
            "sequential_image_generation": "auto",
            "sequential_image_generation_options": {
                "max_images": 1
            },
            "response_format": "url",
            "size": "2K",
            "stream": False, # Changed to False for simpler handling
            "watermark": True
        }

        if image_url:
            payload["image"] = image_url

        try:
            response = requests.post(self.api_url, json=payload, headers=headers)
            response.raise_for_status()
            
            # Log raw response for debugging
            logger.info(f"API Response status: {response.status_code}")
            logger.info(f"API Response content: {response.text}")
            
            data = response.json()
            
            # Check if data is a string (error case)
            if isinstance(data, str):
                logger.error(f"Response is a string, not JSON object: {data}")
                raise Exception(f"Invalid response format: {data}")
            
            # Extract image URL from response
            # Response format usually: { "data": [ { "url": "..." } ] }
            if "data" in data and isinstance(data["data"], list) and len(data["data"]) > 0:
                if "url" in data["data"][0]:
                    return data["data"][0]["url"]
                else:
                    logger.error(f"No 'url' in first data item: {data['data'][0]}")
                    raise Exception("No image URL in response data")
            else:
                logger.error(f"Unexpected response format: {data}")
                raise Exception("No image URL in response")

        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to generate image: {e}")
            if hasattr(e, 'response') and e.response:
                logger.error(f"Response content: {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"Error processing image generation: {e}")
            raise

image_service = ImageService()
