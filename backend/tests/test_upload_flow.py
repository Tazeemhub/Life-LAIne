from io import BytesIO
from pathlib import Path
from tempfile import TemporaryDirectory
from types import SimpleNamespace
import sys
import unittest
from unittest.mock import AsyncMock, Mock, patch

from fastapi import BackgroundTasks, HTTPException, UploadFile
from starlette.datastructures import Headers

sys.modules.setdefault(
    "app.services.extraction",
    SimpleNamespace(process_document=AsyncMock()),
)

from app.routers import upload as upload_router
from app.services import blob_storage
from app.services.blob_storage import BlobStorageService, StorageUnavailableError


class BlobStorageServiceTests(unittest.IsolatedAsyncioTestCase):
    async def test_upload_file_sanitizes_filename_and_stays_under_storage_root(self) -> None:
        with TemporaryDirectory() as temp_dir:
            with patch.object(
                blob_storage,
                "settings",
                SimpleNamespace(
                    azure_storage_connection_string=None,
                    use_azure_storage=False,
                    azure_storage_container="medical-documents",
                    storage_path=temp_dir,
                ),
            ):
                service = BlobStorageService()
                stored_path = await service.upload_file(
                    b"hello",
                    "../../etc/passwd?.pdf",
                    "application/pdf",
                )

            resolved = Path(stored_path).resolve()
            storage_root = Path(temp_dir).resolve()
            self.assertTrue(str(resolved).startswith(str(storage_root)))
            self.assertEqual(resolved.suffix, ".pdf")
            self.assertNotIn("..", resolved.name)
            self.assertIn("_", resolved.name)


class UploadRouteFailureTests(unittest.IsolatedAsyncioTestCase):
    async def test_upload_returns_503_and_skips_db_on_storage_failure(self) -> None:
        db = SimpleNamespace(add=Mock(), commit=AsyncMock(), rollback=AsyncMock())
        patient = SimpleNamespace(id="patient-1", preferred_language="en")
        background_tasks = BackgroundTasks()
        upload_file = UploadFile(
            file=BytesIO(b"pdf"),
            filename="report.pdf",
            headers=Headers({"content-type": "application/pdf"}),
        )

        with patch.object(
            upload_router.blob_storage_service,
            "upload_file",
            new=AsyncMock(side_effect=StorageUnavailableError("Document storage is temporarily unavailable. Please try again.")),
        ):
            with self.assertRaises(HTTPException) as ctx:
                await upload_router.upload_document(
                    background_tasks=background_tasks,
                    file=upload_file,
                    folder=None,
                    is_xerox=False,
                    tags=None,
                    uploaded_by="patient",
                    patient=patient,
                    db=db,
                )

        self.assertEqual(ctx.exception.status_code, 503)
        self.assertIn("temporarily unavailable", str(ctx.exception.detail))
        db.add.assert_not_called()
        db.commit.assert_not_awaited()
        db.rollback.assert_not_awaited()
        self.assertEqual(len(background_tasks.tasks), 0)

    async def test_upload_rolls_back_and_cleans_file_when_db_commit_fails(self) -> None:
        db = SimpleNamespace(add=Mock(), commit=AsyncMock(side_effect=RuntimeError("db down")), rollback=AsyncMock())
        patient = SimpleNamespace(id="patient-1", preferred_language="en")
        background_tasks = BackgroundTasks()
        upload_file = UploadFile(
            file=BytesIO(b"pdf"),
            filename="report.pdf",
            headers=Headers({"content-type": "application/pdf"}),
        )
        stored_path = "/tmp/uploads/blob.pdf"

        with patch.object(upload_router.blob_storage_service, "upload_file", new=AsyncMock(return_value=stored_path)):
            with patch.object(upload_router.blob_storage_service, "delete_file", new=AsyncMock()) as delete_file:
                with self.assertRaises(HTTPException) as ctx:
                    await upload_router.upload_document(
                        background_tasks=background_tasks,
                        file=upload_file,
                        folder=None,
                        is_xerox=False,
                        tags=None,
                        uploaded_by="patient",
                        patient=patient,
                        db=db,
                    )

        self.assertEqual(ctx.exception.status_code, 500)
        self.assertIn("Failed to save uploaded document", str(ctx.exception.detail))
        db.add.assert_called_once()
        db.commit.assert_awaited_once()
        db.rollback.assert_awaited_once()
        delete_file.assert_awaited_once_with(stored_path)
        self.assertEqual(len(background_tasks.tasks), 0)


if __name__ == "__main__":
    unittest.main()
