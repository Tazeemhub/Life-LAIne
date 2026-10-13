import logging
from typing import Optional
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class DocumentIntelligenceService:
    """
    Calls Azure AI Document Intelligence for OCR/text extraction.
    Falls back to simple text extraction for local development.
    """

    def __init__(self):
        self.use_azure = (
            bool(settings.azure_document_intelligence_endpoint)
            and bool(settings.azure_document_intelligence_key)
            and settings.use_azure_doc_intelligence
        )
        if self.use_azure:
            logger.info("Azure Document Intelligence initialized.")
        else:
            logger.info("Using local OCR fallback (PyMuPDF / basic text extraction).")

    async def extract_text(self, file_bytes: bytes, content_type: str) -> str:
        """Extract raw text from document bytes."""
        if self.use_azure:
            return await self._extract_azure(file_bytes, content_type)
        else:
            return await self._extract_local(file_bytes, content_type)

    async def _extract_azure(self, file_bytes: bytes, content_type: str) -> str:
        """Use Azure Document Intelligence prebuilt-layout model."""
        from azure.ai.documentintelligence.aio import DocumentIntelligenceClient
        from azure.ai.documentintelligence.models import AnalyzeDocumentRequest
        from azure.core.credentials import AzureKeyCredential

        client = DocumentIntelligenceClient(
            endpoint=settings.azure_document_intelligence_endpoint,
            credential=AzureKeyCredential(settings.azure_document_intelligence_key),
        )

        async with client:
            poller = await client.begin_analyze_document(
                "prebuilt-layout",
                AnalyzeDocumentRequest(bytes_source=file_bytes),
                content_type=content_type,
            )
            result = await poller.result()

        # Collect all text from pages
        lines = []
        if result.pages:
            for page in result.pages:
                if page.lines:
                    for line in page.lines:
                        lines.append(line.content)

        return "\n".join(lines)

    async def _extract_local(self, file_bytes: bytes, content_type: str) -> str:
        """Local fallback: extract text using PyMuPDF or basic decode."""
        if content_type == "application/pdf":
            return self._extract_pdf(file_bytes)
        elif content_type in ("image/jpeg", "image/png", "image/jpg"):
            return self._extract_image(file_bytes)
        else:
            # Try to decode as text
            try:
                return file_bytes.decode("utf-8", errors="ignore")
            except Exception:
                return ""

    def _extract_pdf(self, file_bytes: bytes) -> str:
        try:
            import fitz  # PyMuPDF
            doc = fitz.open(stream=file_bytes, filetype="pdf")
            text = ""
            for page in doc:
                text += page.get_text()
            return text
        except ImportError:
            logger.warning("PyMuPDF not installed. Falling back to built-in stream parser.")
            import re
            matches = re.findall(rb'\((.*?)\)\s*Tj', file_bytes)
            if matches:
                return "\n".join(m.decode("latin-1", errors="ignore").replace("\\(", "(").replace("\\)", ")") for m in matches)
            return "[PDF text extraction unavailable — PyMuPDF not installed]"
        except Exception as e:
            logger.error(f"PDF extraction error: {e}")
            return ""

    def _extract_image(self, file_bytes: bytes) -> str:
        try:
            import pytesseract
            from PIL import Image
            import io
            image = Image.open(io.BytesIO(file_bytes))
            return pytesseract.image_to_string(image)
        except ImportError:
            logger.warning("pytesseract or PIL not installed. Image OCR unavailable.")
            return "[Image OCR unavailable — pytesseract not installed]"
        except Exception as e:
            logger.error(f"Image OCR error: {e}")
            return ""


document_intelligence_service = DocumentIntelligenceService()
