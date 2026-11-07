# ADR 0004: Tự làm authentication trong NestJS

**Trạng thái:** Đã chấp nhận (2026-11-07)

**Bối cảnh:** Hệ thống chạy local, cần hoạt động offline, không có người dùng thật.

**Quyết định:** Email/password với JWT ngắn hạn và refresh token xoay vòng. Mật khẩu băm bằng thuật toán chuyên dụng, quyền luôn lấy từ membership phía server.

**Hệ quả:** Không phụ thuộc bên ngoài, nhưng tự chịu trách nhiệm về an toàn auth. MFA, SSO và đặt lại mật khẩu qua email ngoài phạm vi.
