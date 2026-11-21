from app.assessment import validate_assessment, verify_quote


def test_exact_offsets_and_half_open_end_boundary():
    assert verify_quote("abc終", "終", 3, 4).valid
    result = verify_quote("abc終", "終")
    assert (result.start_offset, result.end_offset) == (3, 4)


def test_wrong_offsets_absent_and_ellipsis():
    assert verify_quote("abcdef", "bcd", 0, 3).reason == "quote_mismatch"
    assert verify_quote("abcdef", "nope").reason == "quote_not_found"
    assert not verify_quote("abcdef", "ab...ef").valid
    assert not verify_quote("abcdef", "ab…ef").valid


def test_ambiguous_occurrence_and_unicode():
    result = verify_quote("naïve naïve", "naïve")
    assert result.valid and result.ambiguous and result.start_offset == 0
    assert verify_quote("e\u0301", "é").reason == "quote_not_found"


def test_assessment_downgrades_and_preserves_raw_level():
    result = validate_assessment("strong", [{"quote": "missing"}], "resume")
    assert (result.level, result.raw_level, result.reason) == (
        "needs_review",
        "strong",
        "no_valid_evidence",
    )
    valid = validate_assessment("strong", [{"quote": "resume"}], "resume")
    assert (valid.level, valid.evidence_valid, valid.reason) == ("strong", True, None)
    assert validate_assessment("unknown", [], "resume").level == "unknown"
