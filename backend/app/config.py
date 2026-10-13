from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache
from typing import Optional


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=(".env", "backend/.env", "../backend/.env"), env_file_encoding="utf-8", extra="ignore")

    @field_validator("gemini_api_key", "firebase_project_id", "firebase_credentials_path", mode="before")
    @classmethod
    def strip_whitespace(cls, v):
        if isinstance(v, str):
            v = v.strip()
            return v if v else None
        return v

    # App
    environment: str = "development"
    storage_path: str = "./uploads"

    # Database (PostgreSQL / SQLite fallback)
    database_url: str = "sqlite+aiosqlite:///./healthcopilot.db"

    # Firebase Database (Firestore)
    use_firebase: bool = False
    firebase_project_id: Optional[str] = None
    firebase_credentials_path: Optional[str] = None

    # Google Gemini API
    gemini_api_key: Optional[str] = None
    gemini_model: str = "gemini-2.5-flash"
    use_gemini: bool = True

    # Azure OpenAI (alternative / legacy)
    azure_openai_endpoint: Optional[str] = None
    azure_openai_api_key: Optional[str] = None
    azure_openai_deployment_name: str = "gpt-4o"
    azure_openai_api_version: str = "2024-08-01-preview"
    llm_model: str = "gpt-4o"

    # Azure AI Document Intelligence
    azure_document_intelligence_endpoint: Optional[str] = None
    azure_document_intelligence_key: Optional[str] = None

    # Azure Blob Storage
    azure_storage_connection_string: Optional[str] = None
    azure_storage_container: str = "medical-documents"

    # Microsoft Entra ID
    azure_ad_tenant_id: Optional[str] = None
    azure_ad_client_id: Optional[str] = None
    azure_ad_client_secret: Optional[str] = None

    # Feature flags
    use_azure_storage: bool = False
    use_azure_doc_intelligence: bool = False
    use_azure_openai: bool = False

    @property
    def is_gemini_active(self) -> bool:
        return bool(self.gemini_api_key) and self.use_gemini

    @property
    def is_firebase_active(self) -> bool:
        return self.use_firebase and bool(self.firebase_project_id or self.firebase_credentials_path)

    @property
    def use_local_storage(self) -> bool:
        return not self.use_azure_storage or not self.azure_storage_connection_string

    @property
    def use_mock_ai(self) -> bool:
        return not self.is_gemini_active and (not self.use_azure_openai or not self.azure_openai_api_key)


@lru_cache()
def get_settings() -> Settings:
    return Settings()
