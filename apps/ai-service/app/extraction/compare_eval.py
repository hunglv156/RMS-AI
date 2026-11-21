"""Opt-in, read-only comparison: uv run python -m app.extraction.compare_eval --data-root PATH.

The small manifest reader accepts the flat cvs entries in set-10x2.yaml only;
unknown metadata is ignored. It intentionally avoids an extra YAML dependency.
"""

import argparse
import hashlib
import re
import sys
from difflib import SequenceMatcher
from pathlib import Path

from .document import ExtractionError, extract_document


def read_entries(path: Path) -> list[dict[str, str]]:
    entries: list[dict[str, str]] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        match = re.fullmatch(r"- sheet_id: ([A-Za-z0-9_-]+)", line)
        if match:
            entries.append({"sheet_id": match[1]})
        elif entries:
            match = re.fullmatch(r"  (text_sha256|occupation_folder): ([A-Za-z0-9_-]+)", line)
            if match:
                entries[-1][match[1]] = match[2]
    if not entries or any("text_sha256" not in entry for entry in entries):
        raise ValueError("Expected flat cvs entries with sheet_id and text_sha256")
    return entries


def compare(data_root: Path) -> int:
    entries = read_entries(data_root / "eval" / "set-10x2.yaml")
    wanted = {entry["text_sha256"] for entry in entries}
    sources: dict[str, Path] = {}
    for path in sorted(data_root.glob("*/*")):
        if path.is_file() and path.suffix.lower() == ".pdf":
            digest = hashlib.sha256(path.read_bytes()).hexdigest()
            if digest in wanted:
                sources.setdefault(digest, path)
    print("extract-v1 / norm-v1; eng; 200 DPI; SequenceMatcher(autojunk=False)")
    print("Confidence: unweighted mean of page word-means (0-100); lengths: Unicode characters.")
    print("Stored text is compared exactly as saved, without re-normalizing it.")
    print("CV             Pages Methods       OCR mean  New chars Stored chars Similarity Status")
    failed = False
    for entry in entries:
        sheet = entry["sheet_id"]
        digest = entry["text_sha256"]
        source = sources.get(digest)
        if source is None:
            print(
                f"{sheet:14}     - -                    -          -            -          - "
                f"NOT_PDF_HASH: {digest}"
            )
            failed = True
            continue
        try:
            stored = (data_root / "eval" / "text" / f"{digest}.txt").read_text(encoding="utf-8")
            result = extract_document(source.read_bytes())
        except (ExtractionError, OSError) as exc:
            print(f"{sheet:14} ERROR: {type(exc).__name__}")
            failed = True
            continue
        confidences = [
            p.ocr_mean_confidence for p in result.pages if p.ocr_mean_confidence is not None
        ]
        mean = f"{sum(confidences) / len(confidences):.2f}" if confidences else "-"
        methods = "+".join(sorted({page.method for page in result.pages}))
        similarity = SequenceMatcher(None, result.text, stored, autojunk=False).ratio()
        print(
            f"{sheet:14} {len(result.pages):5} {methods:13} {mean:>8} "
            f"{len(result.text):10} {len(stored):12} {similarity:10.4f} "
            f"{','.join(result.flags) or 'ok'}"
        )
        print(f"  source={source.relative_to(data_root)}; sha256={digest}")
    return int(failed)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data-root", type=Path, required=True)
    args = parser.parse_args()
    return compare(args.data_root)


if __name__ == "__main__":
    sys.exit(main())
