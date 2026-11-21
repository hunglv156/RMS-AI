"""Exact quote verification and conservative assessment validation."""

from typing import Any

from pydantic import BaseModel, ConfigDict


class QuoteVerification(BaseModel):
    model_config = ConfigDict(extra="forbid")

    valid: bool
    start_offset: int | None = None
    end_offset: int | None = None
    reason: str | None = None
    ambiguous: bool = False


class AssessmentValidation(BaseModel):
    model_config = ConfigDict(extra="forbid")

    level: str
    raw_level: str
    reason: str | None = None
    evidence_valid: bool


def verify_quote(
    text: str, quote: str, start_offset: int | None = None, end_offset: int | None = None
) -> QuoteVerification:
    """Verify exact quote text using half-open offsets or first exact occurrence."""
    if not quote:
        return QuoteVerification(valid=False, reason="empty_quote")
    if "..." in quote or "…" in quote:
        return QuoteVerification(valid=False, reason="ellipsis_shortening")
    if (start_offset is None) != (end_offset is None):
        return QuoteVerification(valid=False, reason="both_offsets_required")
    if start_offset is not None and end_offset is not None:
        if start_offset < 0 or end_offset < start_offset or end_offset > len(text):
            return QuoteVerification(valid=False, reason="offset_out_of_range")
        if text[start_offset:end_offset] != quote:
            return QuoteVerification(valid=False, reason="quote_mismatch")
        return QuoteVerification(valid=True, start_offset=start_offset, end_offset=end_offset)
    first = text.find(quote)
    if first < 0:
        return QuoteVerification(valid=False, reason="quote_not_found")
    ambiguous = text.find(quote, first + 1) >= 0
    return QuoteVerification(
        valid=True, start_offset=first, end_offset=first + len(quote), ambiguous=ambiguous
    )


def validate_assessment(
    level: str, evidence: list[dict[str, Any]], text: str
) -> AssessmentValidation:
    """Downgrade unsupported levels without valid evidence, retaining raw level for audit."""
    validations = [
        verify_quote(text, item.get("quote", ""), item.get("start_offset"), item.get("end_offset"))
        for item in evidence
    ]
    has_valid = any(item.valid for item in validations)
    if level not in {"unknown", "needs_review"} and not has_valid:
        return AssessmentValidation(
            level="needs_review", raw_level=level, reason="no_valid_evidence", evidence_valid=False
        )
    return AssessmentValidation(level=level, raw_level=level, evidence_valid=has_valid)
