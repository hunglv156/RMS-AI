"""Local PDF extraction; offsets count Python Unicode characters, not bytes."""

from .document import (
    EXTRACTOR_VERSION,
    NORMALIZATION_VERSION,
    DocumentLimitError,
    EncryptedPDFError,
    ExtractedDocument,
    ExtractedPage,
    ExtractionError,
    ExtractionLimits,
    InvalidPDFError,
    OCRError,
    extract_document,
    normalize_text,
    validate_pdf,
)

__all__ = [
    "EXTRACTOR_VERSION",
    "NORMALIZATION_VERSION",
    "DocumentLimitError",
    "EncryptedPDFError",
    "ExtractedDocument",
    "ExtractedPage",
    "ExtractionError",
    "ExtractionLimits",
    "InvalidPDFError",
    "OCRError",
    "extract_document",
    "normalize_text",
    "validate_pdf",
]
