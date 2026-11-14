# ADR 0009: Tenant context nằm trong token, kiểm tra lại ở server

**Trạng thái:** Đã chấp nhận (2026-11-14). Đóng mục "Tenant context" ở README 17.

**Bối cảnh:** Một người dùng có thể thuộc nhiều tổ chức. Cần biết request đang thao tác trong tổ chức nào mà không tin dữ liệu client gửi.

**Quyết định:**

- Access JWT (15 phút, HS256) chỉ mang `sub` (user) và `org_id` (tổ chức đang active). **Không** mang role.
- Mọi request tenant đều đi qua `TenantInterceptor`: mở transaction, `SET LOCAL app.organization_id`, đọc lại membership của user trong tổ chức đó (phải `active`), rồi mới kiểm tra quyền theo action (`@RequirePermission`). Role luôn lấy từ DB nên đổi role hay khoá thành viên có hiệu lực ngay. Route tenant không khai báo quyền thì bị từ chối (mặc định từ chối).
- Đổi tổ chức bằng `POST /auth/switch-org` (kiểm tra membership, xoay refresh token, cấp access token mới).
- PostgreSQL RLS (`FORCE ROW LEVEL SECURITY`) là lớp thứ hai. Thiếu `app.organization_id` thì truy vấn lỗi (fail closed). App kết nối bằng `rms_app`, AI service bằng `rms_ai`; cả hai không phải superuser và không có BYPASSRLS.
- Repository chỉ lấy DB handle qua `TenantContext.current()`: không có context thì không có handle.
- Việc nền cũng chạy trong context tenant qua `TenantRunner` (cùng cơ chế `SET LOCAL`), và worker kiểm tra lại resume thuộc đúng `organization_id` của job trước khi chạy.
- Ngoại lệ có chủ đích: poller outbox cần thấy job của mọi tenant. Nó dùng hàm `SECURITY DEFINER` `outbox_pending` chỉ trả `id`, tenant, loại và payload của job chưa gửi. Tra cứu membership lúc đăng nhập dùng `auth_memberships(user_id)` theo cách tương tự.
- Gọi nội bộ NestJS → FastAPI ký HMAC-SHA256 trên `service_id, timestamp, method, path, sha256(body)`, cửa sổ 5 phút; FastAPI chỉ bind 127.0.0.1 và kiểm tra object key thuộc đúng tiền tố tổ chức.

**Hệ quả:** Mỗi request tenant tốn thêm một truy vấn membership. Token bị đánh cắp có tác dụng tối đa 15 phút và không nâng được quyền. Refresh token xoay vòng; dùng lại token cũ thì thu hồi cả họ token.
