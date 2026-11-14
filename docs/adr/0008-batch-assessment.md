# ADR 0008: Chấm gộp mọi tiêu chí của một CV trong một lượt gọi

**Trạng thái:** Đã chấp nhận (2026-11-14). Sửa quy tắc "retrieve theo từng tiêu chí" ở README mục 10.4.

**Bối cảnh:** README 10.4 yêu cầu retrieve và đánh giá riêng từng tiêu chí. Với Qwen3 14B chạy local (concurrency 1) thì mỗi CV mất 155s, quá chậm để demo. Spike tăng tốc (`spikes/m1/run_fast.py`, 5 CV Kaggle, một lần chạy mỗi cấu hình) cho kết quả:

| Chỉ số | baseline | fast (1 lượt/tiêu chí) | batch (1 lượt/CV) |
|---|---:|---:|---:|
| Thời gian một CV, trung vị | 155s | 62s | 64s |
| Chấm tiêu chí, thời gian (trung vị) | 19s/lượt | 7s/lượt | 36s cho cả 5 tiêu chí |
| JSON đúng schema | 30/30 | 30/30 | 10/10 |
| Trích dẫn khớp nguyên văn | 88% | 75% | 93% |
| Kết luận thiếu trích dẫn | 0 | 0 | 0 |

Phần lớn mức giảm đến từ hai thay đổi khác, không phải từ việc gộp: đặt CV ở đầu prompt cùng một system prompt dùng chung để Ollama tái dùng KV cache (đọc prompt từ ~6.5s xuống ~0.4s), và rút gọn đầu ra (bỏ summary từng kinh nghiệm, tối đa 2 trích dẫn, rationale một câu). Khi đã có cache, gộp tiêu chí không nhanh hơn chấm riêng; ưu điểm của nó là ít lượt gọi hơn và tỷ lệ trích dẫn khớp cao hơn.

**Quyết định:**

1. Mọi tiêu chí đã duyệt của một JD version được chấm cho một CV trong **một** lượt gọi LLM. Schema đầu ra tạo động: `criterion` là enum mã tiêu chí, số phần tử cố định bằng số tiêu chí, mỗi phần tử gồm `evidence` (tối đa 2 đoạn chép nguyên văn), `rationale` và `level`.
2. Nếu có hơn 8 tiêu chí thì chia thành nhiều lượt; các lượt dùng chung phần đầu prompt (system + CV) để vẫn được cache.
3. Việc bắt buộc ở README 10.4 không đổi: LLM chỉ chọn `level`; mọi `evidence` phải tìm được trong text chuẩn hoá; `level` đã kết luận mà không còn evidence hợp lệ thì hạ xuống `needs_review`; thiếu hoặc trùng tiêu chí thì gọi lại một lần rồi mới trả `failed_validation`.
4. Bước trích xuất hồ sơ chạy nền ngay khi upload (không nằm trong thời gian sàng lọc).
5. Khi làm retrieval ở Phase 4: tiêu chí vẫn được truy xuất theo từng tiêu chí, nhưng **hợp các đoạn đã truy xuất** được đưa vào cùng một lượt gọi (thay cho toàn bộ CV).

**Giới hạn đã biết:**

- Chưa có nhãn của người. Mức `level` của bản gộp chỉ trùng baseline ở 18/25 tiêu chí; chưa biết bản nào đúng hơn. Khác biệt chủ yếu là baseline cho `unknown` còn bản mới cho `adequate` hoặc `partial`.
- Chỉ 5 CV, mỗi cấu hình chạy một lần: các con số để định hướng, không phải benchmark.
- Gộp nhiều tiêu chí trong một lượt có thể làm các tiêu chí ảnh hưởng lẫn nhau (anchoring). Chỉ đo được khi có nhãn ở Phase 5.
- Với CV rất dài, `MAX_CV_CHARS` cắt bớt text; phần bị cắt không được chấm (cờ `truncated` được lưu).

**Hệ quả:** README 10.4 và 17 được sửa cho khớp. Đổi sang chấm từng tiêu chí chỉ cần đổi cách gọi trong `app/assessment`, không đổi contract dữ liệu. Phải đo lại khi có nhãn.
