"""Giải nén an toàn: chỉ lấy .pdf, chặn đường dẫn thoát khỏi thư mục đích."""
import sys, zipfile
from pathlib import Path

archive, dest = Path(sys.argv[1]), Path(sys.argv[2]).resolve()
dest.mkdir(exist_ok=True)
done = skipped = 0
with zipfile.ZipFile(archive) as z:
    assert sum(i.file_size for i in z.infolist()) < 6 * 1024**3, "archive quá lớn khi giải nén"
    for info in z.infolist():
        target = (dest / info.filename).resolve()
        if info.is_dir() or not info.filename.lower().endswith(".pdf") or not target.is_relative_to(dest):
            skipped += not info.is_dir()
            continue
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(z.read(info))
        done += 1
print("extracted", done, "skipped", skipped)
