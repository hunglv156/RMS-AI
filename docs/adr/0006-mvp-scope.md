# ADR 0006: Phạm vi hệ thống cho luận văn

**Trạng thái:** Đã chấp nhận (2026-11-07)

**Bối cảnh:** Hạn dưới 3 tháng, một người làm, chạy trên máy 16GB.

**Quyết định:** Có Hiring Manager (duyệt JD, nhận xét, chốt shortlist), OCR, bulk upload và UI Việt/Anh. Không có cổng ứng viên, kanban, lịch, email, billing, MFA và cloud. Không có ClamAV, vẫn giữ validate file.

**Hệ quả:** Thiếu quét malware là giới hạn đã biết, phải ghi trong luận văn và phải xử lý trước khi dùng thật. Nếu trễ tiến độ, cắt bulk upload trước, rồi tới màn audit.
