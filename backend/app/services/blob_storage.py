import os
import uuid
import shutil
import logging
from pathlib import Path
from typing import Optional
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class BlobStorageService:
    """
    Handles file storage — uses Azure Blob Storage if configured,
    falls back to local filesystem for development.
    """

    def __init__(self):
        self.use_azure = bool(settings.azure_storage_connection_string) and settings.use_azure_storage
        self.container_name = settings.azure_storage_container

        is_serverless = bool(os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"))
        is_readonly = not os.access(".", os.W_OK)

        if is_serverless or is_readonly:
            self.local_path = Path("/tmp/uploads")
        else:
            self.local_path = Path(settings.storage_path)

        try:
            self.local_path.mkdir(parents=True, exist_ok=True)
        except Exception as e:
            logger.warning(f"Could not create storage path {self.local_path}, falling back to /tmp/uploads: {e}")
            self.local_path = Path("/tmp/uploads")
            try:
                self.local_path.mkdir(parents=True, exist_ok=True)
            except Exception:
                pass

        if self.use_azure:
            try:
                from azure.storage.blob.aio import BlobServiceClient
                self._client = BlobServiceClient.from_connection_string(
                    settings.azure_storage_connection_string
                )
                logger.info("Azure Blob Storage initialized.")
            except Exception as e:
                logger.warning(f"Azure Blob Storage init failed, falling back to local: {e}")
                self.use_azure = False
        else:
            logger.info("Using local file storage at %s", self.local_path)

    async def upload_file(self, file_bytes: bytes, filename: str, content_type: str = "application/octet-stream") -> str:
        """Upload file and return URL/path."""
        safe_name = f"{uuid.uuid4()}_{filename}"

        if self.use_azure:
            return await self._upload_azure(file_bytes, safe_name, content_type)
        else:
            return await self._upload_local(file_bytes, safe_name)

    async def _upload_azure(self, file_bytes: bytes, blob_name: str, content_type: str) -> str:
        from azure.storage.blob import ContentSettings
        from azure.storage.blob.aio import BlobServiceClient
        client = BlobServiceClient.from_connection_string(settings.azure_storage_connection_string)
        async with client:
            container = client.get_container_client(self.container_name)
            try:
                await container.create_container()
            except Exception:
                pass  # Already exists
            blob = container.get_blob_client(blob_name)
            await blob.upload_blob(
                file_bytes,
                overwrite=True,
                content_settings=ContentSettings(content_type=content_type)
            )
        return f"https://{client.account_name}.blob.core.windows.net/{self.container_name}/{blob_name}"

    async def _upload_local(self, file_bytes: bytes, filename: str) -> str:
        try:
            self.local_path.mkdir(parents=True, exist_ok=True)
        except Exception:
            self.local_path = Path("/tmp/uploads")
            self.local_path.mkdir(parents=True, exist_ok=True)
        dest = self.local_path / filename
        dest.write_bytes(file_bytes)
        return str(dest)

    async def get_file_bytes(self, url_or_path: str) -> bytes:
        """Download file bytes from Azure or local path."""
        if url_or_path.startswith("https://"):
            return await self._download_azure(url_or_path)
        else:
            p = Path(url_or_path)
            if not p.exists():
                tmp_p = Path("/tmp/uploads") / p.name
                if tmp_p.exists():
                    return tmp_p.read_bytes()
            return p.read_bytes()

    async def _download_azure(self, url: str) -> bytes:
        from azure.storage.blob.aio import BlobClient
        async with BlobClient.from_blob_url(url) as blob:
            stream = await blob.download_blob()
            return await stream.readall()

    async def delete_file(self, url_or_path: str) -> None:
        if url_or_path.startswith("https://"):
            from azure.storage.blob.aio import BlobClient
            async with BlobClient.from_blob_url(url_or_path) as blob:
                await blob.delete_blob()
        else:
            path = Path(url_or_path)
            if path.exists():
                path.unlink()


blob_storage_service = BlobStorageService()
