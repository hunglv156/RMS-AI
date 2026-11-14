"""Định vị trích dẫn trên text đã chuẩn hoá (README 10.3: offset nửa mở [start, end))."""

import re
from dataclasses import dataclass

MIN_QUOTE_CHARS = 4
ELLIPSIS = re.compile(r"\.{3,}|…")


@dataclass(frozen=True)
class Located:
    start: int
    end: int
    text: str  # đoạn nguyên văn lấy từ CV, không phải bản model chép


def _squash(text: str) -> tuple[str, list[int]]:
    """Bỏ mọi khoảng trắng và casefold; trả kèm vị trí gốc của từng ký tự còn lại."""
    chars: list[str] = []
    index: list[int] = []
    for i, ch in enumerate(text):
        if ch.isspace():
            continue
        for folded in ch.casefold():
            chars.append(folded)
            index.append(i)
    return "".join(chars), index


def locate_quote(text: str, quote: str) -> Located | None:
    """Tìm `quote` trong `text` bất kể khác biệt về khoảng trắng/xuống dòng/hoa-thường.

    Quote đã bị rút gọn bằng "..." thì không còn là nguyên văn: bị loại, trừ khi chính CV có
    đúng chuỗi đó. Trả về đoạn gốc trong CV cùng offset, để offset luôn trỏ vào text thật.
    """
    squashed_text, index = _squash(text)
    squashed_quote, _ = _squash(quote)
    if len(squashed_quote) < MIN_QUOTE_CHARS:
        return None
    pos = squashed_text.find(squashed_quote)
    if pos < 0:
        return None
    start = index[pos]
    end = index[pos + len(squashed_quote) - 1] + 1
    return Located(start, end, text[start:end])


def has_ellipsis(quote: str) -> bool:
    return bool(ELLIPSIS.search(quote))
