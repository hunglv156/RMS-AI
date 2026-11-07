# ADR 0003: bge-m3, bge-reranker-v2-m3 và chỉ dùng pgvector

**Trạng thái:** Đã chấp nhận (2026-11-07)

**Bối cảnh:** Mỗi truy vấn chỉ tìm trong các chunk của một CV. Vector DB riêng như Qdrant phải tự làm tenant isolation và xoá dữ liệu, nằm ngoài RLS của PostgreSQL.

**Quyết định:** Embedding bằng `bge-m3`, rerank bằng `bge-reranker-v2-m3`, lưu vector trong pgvector, lọc theo `(organization_id, resume_id)` và so khoảng cách chính xác. Không tạo ANN index và không dùng Qdrant.

**Hệ quả:** Toàn bộ dữ liệu tenant nằm trong một ranh giới bảo vệ. Khi có tìm kiếm ứng viên toàn tenant thì phải xem xét lại ANN index.
