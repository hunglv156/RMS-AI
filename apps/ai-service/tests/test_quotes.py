from app.assessment.quotes import has_ellipsis, locate_quote

CV = "Senior Engineer\nBuilt REST APIs with  FastAPI\nand PostgreSQL.\n\nAgile / Scrum team lead"


def test_exact_match_returns_offsets_into_text() -> None:
    found = locate_quote(CV, "Senior Engineer")
    assert found is not None
    assert CV[found.start : found.end] == found.text == "Senior Engineer"
    assert (found.start, found.end) == (0, 15)


def test_whitespace_and_newline_differences_are_ignored() -> None:
    found = locate_quote(CV, "REST APIs with FastAPI and PostgreSQL")
    assert found is not None
    # Offset trỏ vào text thật (kèm khoảng trắng/xuống dòng gốc), không phải bản đã gọn.
    assert found.text == "REST APIs with  FastAPI\nand PostgreSQL"
    assert CV[found.start : found.end] == found.text


def test_case_insensitive() -> None:
    found = locate_quote(CV, "agile / SCRUM team lead")
    assert found is not None and found.text == "Agile / Scrum team lead"


def test_vietnamese_with_diacritics() -> None:
    cv = "Kỹ sư phần mềm\nCó kinh nghiệm   làm việc nhóm"
    found = locate_quote(cv, "kinh nghiệm làm việc nhóm")
    assert found is not None and found.text == "kinh nghiệm   làm việc nhóm"
    assert locate_quote(cv, "kinh nghiem lam viec nhom") is None  # không bỏ dấu


def test_missing_quote_is_none() -> None:
    assert locate_quote(CV, "Kubernetes and Terraform") is None


def test_quote_shortened_with_ellipsis_is_rejected() -> None:
    assert has_ellipsis("Built REST APIs ... PostgreSQL")
    assert has_ellipsis("Built REST APIs… PostgreSQL")
    # "..." làm quote không còn là chuỗi liên tục trong CV nên không định vị được.
    assert locate_quote(CV, "Built REST APIs ... PostgreSQL") is None


def test_ellipsis_present_in_cv_itself_is_matched_verbatim() -> None:
    cv = "Skills: Python... and more"
    assert locate_quote(cv, "Python... and more") is not None


def test_too_short_quote_rejected() -> None:
    assert locate_quote(CV, "a") is None
    assert locate_quote(CV, "   ") is None


def test_returns_first_occurrence_and_span_is_half_open() -> None:
    cv = "Docker experience. More Docker experience."
    found = locate_quote(cv, "docker experience")
    assert found is not None and found.start == 0 and found.end == len("Docker experience")
