# Lá · Sàng lọc CV

Giao diện tiếng Việt để đối chiếu một CV PDF với mô tả công việc. Cần Node 26 và pnpm 9.15.4. Chạy các lệnh dưới đây từ thư mục gốc của workspace.

## Chạy bản trải nghiệm

```sh
pnpm install
VITE_USE_MOCK=1 pnpm --filter @rms-ai/web dev
```

Mở địa chỉ Vite in ra (mặc định `http://127.0.0.1:5173`). Chọn JD mẫu, tải một PDF bất kỳ, chọn **Kịch bản trải nghiệm**, rồi nhấn **Bắt đầu sàng lọc**. Sau khoảng 12 giây, bạn sẽ thấy kết quả đã sàng lọc lại, kết quả không sàng lọc lại hoặc lỗi dịch vụ, tùy lựa chọn. **Dừng chờ kết quả** hủy lượt chờ; bạn có thể thử lại ngay.

Trong chế độ này, CV không được gửi đi. Kết quả là dữ liệu mẫu cố định cho JD Backend Python, không được tính từ CV hay các chỉnh sửa JD của bạn. Hai tệp trong `src/fixtures/` được sao chép nguyên bản từ:

- `data/eval/runs/20261122T182731Z-heldout-final-flashlow-v2-hedge20-esc-nr-argonmedium/pairs/python_dev-h1__jd-py-real.json`
- `data/eval/runs/20261122T182731Z-heldout-final-flashlow-v2-hedge20-esc-nr-argonmedium/pairs/designer-h1__jd-py-real.json`

Phần `screening` giữ nguyên trường và giá trị của `result` trong các tệp trên. Số trang/ký tự trích xuất và cấu hình hoạt động ở chế độ mẫu là dữ liệu minh họa; thời gian phản hồi lưu trong JSON là thời gian của lượt đánh giá gốc. Các JD mẫu trong `jds.json` được sao chép từ hai YAML ở `data/eval/jds/`.

## Phân tích bằng dịch vụ thật

Khởi động ai-service tại `http://127.0.0.1:8100` theo README của dịch vụ, rồi chạy:

```sh
pnpm --filter @rms-ai/web dev
```

Đảm bảo môi trường không đặt `VITE_USE_MOCK=1`. Vite chuyển tiếp `/api/ai/*` tới ai-service, bỏ tiền tố `/api/ai`. Khi triển khai bản build, cấu hình reverse proxy với cùng quy tắc; proxy của Vite chỉ hoạt động ở chế độ phát triển.

Chọn JD mẫu hoặc nhập JD qua **Biểu mẫu** / **JSON**. JD cần 1–8 tiêu chí, mã tiêu chí khác nhau và trọng số của mỗi tiêu chí lớn hơn 0. Chọn một PDF rồi nhấn **Bắt đầu sàng lọc**. Nếu PDF có mật khẩu, hãy tải bản đã mở khóa. Nếu tệp quá lớn hoặc không đọc được, giao diện hướng dẫn bạn thử một bản PDF khác.

Kết quả hiển thị độ bao phủ và ngưỡng công bố điểm. Dấu “—” nghĩa là chưa đủ dữ liệu để công bố điểm, không phải điểm 0. Huy hiệu xác minh cho biết trích dẫn có đối chiếu được với nội dung CV hay không; nó không xác nhận thông tin ứng viên khai là đúng. Banner **Cần người xem lại** xuất hiện khi có tiêu chí cần xem lại, kết quả yêu cầu kiểm tra thủ công hoặc đã kích hoạt mô hình sàng lọc lại. Nhấn biểu tượng thông tin ở đầu trang để xem cấu hình hoạt động.

Chọn **Xuất JSON** để tải toàn bộ phản hồi hoặc biểu tượng máy in để in kết quả. Bản in chỉ gồm phần kết quả. Biểu tượng mặt trăng/mặt trời đổi giao diện; lựa chọn được lưu trên thiết bị. Dừng chờ ngắt yêu cầu ở trình duyệt, nhưng máy chủ có thể tiếp tục tác vụ đã nhận.

## Kiểm tra thay đổi

```sh
pnpm --filter @rms-ai/web check
# Hoặc toàn workspace:
pnpm check
```

`check` chạy lint, TypeScript, Vitest/Testing Library và bản build. Có thể chạy riêng `lint`, `typecheck`, `test`, `build`. Ảnh kiểm tra bằng Orca browser nằm trong `docs/screenshots/`; ghi chú kiểm tra ở `docs/verification.md`.

## Đổi nguồn API

`src/lib/api/types.ts` định nghĩa `ScreeningClient`; `getClient()` trong `client.ts` chọn HTTP hoặc mock. Khi nối NestJS, truyền tiền tố mới vào `createHttpClient()` nếu giữ hợp đồng hiện tại, hoặc cung cấp một adapter thực thi `ScreeningClient`. HTTP client dùng ba endpoint `/internal/v1/screening-config`, `/internal/v1/sample-jds`, `/internal/v1/screenings`, gửi multipart với đúng hai trường `cv` và `jd`. Không đặt khóa API trong biến `VITE_*`.

Nhãn mức phù hợp dùng các ngưỡng giao diện minh họa: từ 70 điểm là “Phù hợp với vị trí”, từ 40 là “Phù hợp một phần”, dưới 40 là “Mức độ phù hợp thấp”. Đây không phải ngưỡng đã hiệu chỉnh và không thay thế quyết định tuyển dụng.
