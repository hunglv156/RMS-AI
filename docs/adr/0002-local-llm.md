# ADR 0002: Qwen3 tự host, có gate và fallback

**Trạng thái:** Đã chấp nhận, chờ kết quả gate M1 (2026-11-07)

**Bối cảnh:** CV chứa dữ liệu cá nhân và có thể là CV thật. Với 16GB RAM, chỉ Qwen3 bản nhỏ là khả thi. Chất lượng tiếng Việt và tốc độ chưa được kiểm chứng.

**Quyết định:** Dùng Qwen3 bản nhỏ qua Ollama, gọi bằng API tương thích OpenAI sau interface `LLMProvider`. Tuần đầu chạy gate gồm JSON hợp lệ ổn định, tiếng Việt đúng khi kiểm tra tay và thời gian xử lý chấp nhận được. Không đạt thì đổi sang LLM API qua cùng interface, chỉ gửi CV đã ẩn danh.

**Hệ quả:** CV mặc định không rời khỏi máy. Xử lý tuần tự nên screening chậm, concurrency LLM là 1.
