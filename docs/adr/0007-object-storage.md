# ADR 0007: RustFS làm object storage local

**Trạng thái:** Đã chấp nhận (2026-11-07)

**Bối cảnh:** Plan ban đầu dùng MinIO, nhưng image `minio/minio` không còn kéo được từ Docker Hub lẫn Quay.

**Quyết định:** Dùng RustFS, ghim theo digest, cổng 59000. Code chỉ giao tiếp qua giao thức S3 và không dùng API riêng của RustFS.

**Hệ quả:** Đổi sang dịch vụ S3 khác chỉ cần đổi endpoint và credential. RustFS còn mới, nên nếu gặp lỗi tương thích thì ghi lại ở đây.
