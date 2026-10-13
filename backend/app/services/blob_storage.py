import uuid
import logging
import re
from pathlib import Path
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class StorageUnavailableError(Exception):
    """Raised when backing storage cannot accept uploads."""


class BlobStorageService:
    """
    Handles file storage — uses Azure Blob Storage if configured,
    falls back to local filesystem for development.
    """

    def __init__(self):
        self.use_azure = bool(settings.azure_storage_connection_string) and settings.use_azure_storage
        self.container_name = settings.azure_storage_container
        self.local_path = Path(settings.storage_path)
        self.local_path.mkdir(parents=True, exist_ok=True)
        self._local_path_resolved = self.local_path.resolve()
        self._client = None

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
        safe_name = self._build_storage_name(filename)
        try:
            if self.use_azure:
                return await self._upload_azure(file_bytes, safe_name, content_type)
            return await self._upload_local(file_bytes, safe_name)
        except StorageUnavailableError:
            raise
        except Exception as exc:
            logger.exception("Upload failed for filename '%s'", filename)
            raise StorageUnavailableError("Document storage is temporarily unavailable. Please try again.") from exc

    def _build_storage_name(self, filename: str) -> str:
        original_name = Path(filename or "").name
        if not original_name:
            original_name = "upload"

        stem = Path(original_name).stem
        suffix = Path(original_name).suffix
        safe_stem = re.sub(r"[^a-zA-Z0-9._-]+", "-", stem).strip("-._")
        if not safe_stem:
            safe_stem = "upload"
        safe_suffix = re.sub(r"[^a-zA-Z0-9.]+", "", suffix)

        return f"{uuid.uuid4()}_{safe_stem}{safe_suffix}"

    async def _upload_azure(self, file_bytes: bytes, blob_name: str, content_type: str) -> str:
        from azure.storage.blob import ContentSettings
        if not self._client:
            raise StorageUnavailableError("Document storage is temporarily unavailable. Please try again.")

        try:
            async with self._client:
                container = self._client.get_container_client(self.container_name)
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
                return blob.url
        except Exception as exc:
            logger.exception("Azure blob upload failed for blob '%s'", blob_name)
            raise StorageUnavailableError("Document storage is temporarily unavailable. Please try again.") from exc

    async def _upload_local(self, file_bytes: bytes, filename: str) -> str:
        dest = (self.local_path / filename).resolve()
        try:
            dest.relative_to(self._local_path_resolved)
        except ValueError as exc:
            logger.error("Blocked unsafe local upload path: %s", dest)
            raise StorageUnavailableError("Invalid upload filename.") from exc

        dest.parent.mkdir(parents=True, exist_ok=True)
        try:
            dest.write_bytes(file_bytes)
        except Exception as exc:
            logger.exception("Local file upload failed for path '%s'", dest)
            raise StorageUnavailableError("Document storage is temporarily unavailable. Please try again.") from exc
        return str(dest)

    async def get_file_bytes(self, url_or_path: str) -> bytes:
        """Download file bytes from Azure or local path."""
        if url_or_path.startswith("https://"):
            return await self._download_azure(url_or_path)
        else:
            return Path(url_or_path).read_bytes()

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
