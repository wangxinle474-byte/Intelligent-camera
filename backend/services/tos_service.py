import os
import tos
import logging

logger = logging.getLogger(__name__)

class TosService:
    def __init__(self):
        self.access_key = os.environ.get("TOS_ACCESS_KEY")
        self.secret_key = os.environ.get("TOS_SECRET_KEY")
        self.endpoint = os.environ.get("TOS_ENDPOINT", "tos-cn-beijing.volces.com")
        self.region = os.environ.get("TOS_REGION", "cn-beijing")
        self.bucket = os.environ.get("TOS_BUCKET")

        if self.access_key and self.secret_key:
            self.client = tos.TosClientV2(
                self.access_key,
                self.secret_key,
                self.endpoint,
                self.region
            )
        else:
            logger.warning("TOS credentials not found. Uploads will fail.")
            self.client = None

    def upload_file(self, file_path: str, object_key: str) -> str:
        if not self.client:
            raise Exception("TOS client not initialized")
        
        try:
            self.client.put_object_from_file(self.bucket, object_key, file_path)
            # Construct public URL (assuming bucket is public or we generate signed url)
            # For this demo, we assume public read
            return f"https://{self.bucket}.{self.endpoint}/{object_key}"
        except Exception as e:
            logger.error(f"Failed to upload file to TOS: {e}")
            raise

tos_service = TosService()
