from collections.abc import Sequence

ASSESS_PROMPT_VERSION = "assess-batch-v1"


def build_task(criteria: Sequence[tuple[str, str, str]]) -> str:
    """Phần nhiệm vụ (đứng cuối prompt). criteria: (code, label, description)."""
    lines = []
    for code, label, description in criteria:
        text = f"{label}. {description}".strip() if description else label
        lines.append(f"- {code}: {text}")
    return (
        "Nhiệm vụ: đánh giá lần lượt từng tiêu chí, mỗi tiêu chí đúng một phần tử:\n"
        + "\n".join(lines)
    )
