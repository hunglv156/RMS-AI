from collections.abc import Sequence
from typing import Annotated, Any, Literal

from pydantic import BaseModel, Field, StringConstraints, create_model

Level = Literal["strong", "adequate", "partial", "absent", "unknown", "needs_review"]
Quote = Annotated[str, StringConstraints(max_length=300)]
Rationale = Annotated[str, StringConstraints(max_length=300)]


def build_batch_model(codes: Sequence[str]) -> type[BaseModel]:
    """Schema tạo động cho một lượt chấm gộp.

    `criterion` là enum đúng các mã của lượt này và số phần tử cố định bằng số tiêu chí, nên
    grammar của Ollama không cho model bỏ sót hay thêm tiêu chí (trùng mã vẫn cần kiểm tra sau).
    """
    if not codes:
        raise ValueError("Need at least one criterion")
    code_type: Any = Literal[tuple(codes)]
    item = create_model(
        "BatchItem",
        criterion=(code_type, ...),
        evidence=(list[Quote], Field(max_length=2)),
        rationale=(Rationale, ...),
        level=(Level, ...),
    )
    return create_model(
        "Batch",
        results=(list[item], Field(min_length=len(codes), max_length=len(codes))),
    )
