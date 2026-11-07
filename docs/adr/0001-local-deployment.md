# ADR 0001: Triển khai local, AI runtime chạy native

**Trạng thái:** Đã chấp nhận (2026-11-07)

**Bối cảnh:** Hệ thống phục vụ demo bảo vệ luận văn trên một MacBook M1 Pro RAM 16GB. Docker trên macOS không dùng được GPU Apple.

**Quyết định:** PostgreSQL, Redis và object storage chạy trong Docker. Ollama và AI service chạy native trên macOS. Không triển khai cloud trong đợt này.

**Hệ quả:** Model dùng được Metal. Cách chạy AI service khác các service còn lại nên cần script khởi động riêng. Kết quả hiệu năng chỉ đại diện cho cấu hình máy này.
