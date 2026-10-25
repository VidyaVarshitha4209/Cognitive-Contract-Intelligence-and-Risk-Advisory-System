import os
from pathlib import Path
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Cognitive Contract Intelligence & Risk Advisory System"
    API_V1_STR: str = "/api"
    SECRET_KEY: str = "dev-secret-key-contract-intelligence-btech-final-project"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # Base paths
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    STORAGE_BASE_DIR: Path = Path("D:/contract-intelligence/storage")
    UPLOAD_DIR: Path = Path("D:/contract-intelligence/storage/uploads")
    EXTRACTED_TEXT_DIR: Path = Path("D:/contract-intelligence/storage/extracted_text")
    VECTOR_STORE_DIR: Path = Path("D:/contract-intelligence/storage/vector_store")
    REPORTS_DIR: Path = Path("D:/contract-intelligence/storage/reports")

    # Database Configuration (Oracle SQL default with local fallback)
    DATABASE_TYPE: str = "oracle"  # "oracle" or "sqlite"
    ORACLE_USER: str = "c##contract_user"
    ORACLE_PASSWORD: str = "oracle"
    ORACLE_HOST: str = "localhost"
    ORACLE_PORT: int = 1521
    ORACLE_SERVICE_NAME: str = "xe"  # e.g., "xe", "orcl", "FREEPDB1", "XEPDB1"
    DATABASE_URL: str = ""  # If set in .env, overrides constructed URL

    # AI Provider Settings
    AI_PROVIDER: str = "mock"  # "gemini" or "mock"
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-1.5-flash"

    # Tesseract OCR path override (if needed on Windows)
    TESSERACT_PATH: str = ""

    # Max file upload size: 25 MB
    MAX_UPLOAD_SIZE_BYTES: int = 25 * 1024 * 1024

    @property
    def sqlalchemy_url(self) -> str:
        if self.DATABASE_URL:
            return self.DATABASE_URL
        if self.DATABASE_TYPE == "oracle":
            return f"oracle+oracledb://{self.ORACLE_USER}:{self.ORACLE_PASSWORD}@{self.ORACLE_HOST}:{self.ORACLE_PORT}/?service_name={self.ORACLE_SERVICE_NAME}"
        return f"sqlite:///{(self.STORAGE_BASE_DIR / 'contracts.db').as_posix()}"

    @property
    def upload_dir(self) -> Path:
        return self.UPLOAD_DIR

    @property
    def extracted_text_dir(self) -> Path:
        return self.EXTRACTED_TEXT_DIR

    @property
    def vector_store_dir(self) -> Path:
        return self.VECTOR_STORE_DIR

    @property
    def reports_dir(self) -> Path:
        return self.REPORTS_DIR

    class Config:
        env_file = "D:/contract-intelligence/backend/.env"
        extra = "ignore"

settings = Settings()

# Ensure directories exist
for d in [settings.STORAGE_BASE_DIR, settings.UPLOAD_DIR, settings.EXTRACTED_TEXT_DIR, settings.VECTOR_STORE_DIR, settings.REPORTS_DIR]:
    d.mkdir(parents=True, exist_ok=True)
