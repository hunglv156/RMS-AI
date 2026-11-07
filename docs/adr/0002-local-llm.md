# ADR 0002: Qwen3 14B tự host

**Trạng thái:** Đã chấp nhận (2026-11-07). Gate M1 còn chờ kiểm tra tay tiếng Việt.

**Bối cảnh:** CV chứa dữ liệu cá nhân và có thể là CV thật. Với 16GB RAM, chỉ Qwen3 bản nhỏ là khả thi. Chất lượng tiếng Việt và tốc độ chưa được kiểm chứng.

**Quyết định:** Dùng Qwen3 bản nhỏ qua Ollama, gọi bằng API tương thích OpenAI sau interface `LLMProvider`. Tuần đầu chạy gate gồm JSON hợp lệ ổn định, tiếng Việt đúng khi kiểm tra tay và thời gian xử lý chấp nhận được. Chọn bản 14B vì chất lượng tốt hơn 8B trên 10 CV thử (xem [kết quả M1](../spikes/m1-results.md)). Không dùng LLM API vì không muốn phát sinh chi phí; `LLMProvider` vẫn giữ để có thể đổi sau.

**Hệ quả:** CV mặc định không rời khỏi máy. Xử lý tuần tự nên screening chậm, concurrency LLM là 1. Bản đo hiện tại mất khoảng 227 giây mỗi CV, nên cần tối ưu prompt, chạy nền và chuẩn bị sẵn kết quả khi demo.
