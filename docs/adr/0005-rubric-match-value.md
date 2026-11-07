# ADR 0005: match_value theo rubric rời rạc

**Trạng thái:** Đã chấp nhận (2026-11-07)

**Bối cảnh:** Nếu LLM tự cho số 0–1 thì điểm chỉ deterministic ở bước cộng, còn đầu vào khó tái lập và khó so với nhãn của người.

**Quyết định:** LLM chọn một `level` trên rubric (`strong`, `adequate`, `partial`, `absent`, `unknown`, `needs_review`). Code suy ra `status`, còn `match_value` lấy từ `screening_configs`.

**Hệ quả:** Bảng ánh xạ có version và do người duyệt. Điểm kém mịn hơn nhưng nhãn người và nhãn máy so sánh trực tiếp được. Giá trị mặc định 1.0 / 0.7 / 0.4 là minh hoạ, chưa được hiệu chuẩn.
