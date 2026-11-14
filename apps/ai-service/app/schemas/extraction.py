from typing import Annotated

from pydantic import BaseModel, Field, StringConstraints

# Chặn độ dài từng chuỗi: ở temperature 0 model có thể lặp vô hạn trong một trường tự do
# (đã gặp: "period" lặp tới 2000 token, 205 giây). Grammar của Ollama ép maxLength nên vòng lặp
# bị cắt ngay, đồng thời giảm token sinh ra (spike M1: thời gian chủ yếu nằm ở bước sinh).
Short = Annotated[str, StringConstraints(max_length=80)]
Medium = Annotated[str, StringConstraints(max_length=160)]


class SlimExperience(BaseModel):
    company: Annotated[str, StringConstraints(max_length=100)] | None
    title: Annotated[str, StringConstraints(max_length=100)] | None
    period: Annotated[str, StringConstraints(max_length=40)] | None


class SlimExtraction(BaseModel):
    """Hồ sơ rút gọn: bỏ summary từng kinh nghiệm để giảm token sinh ra (spike M1)."""

    headline: Medium | None
    years_of_experience: float | None
    skills: list[Short] = Field(max_length=20)
    experience: list[SlimExperience] = Field(max_length=8)
    education: list[Medium] = Field(max_length=4)
    languages: list[Short] = Field(max_length=4)
