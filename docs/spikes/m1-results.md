# Kết quả spike M1 (2026-11-07)

**Trạng thái:** chọn Qwen3 14B local, không dùng LLM API vì lý do chi phí. Dataset chốt là Kaggle `hadikp/resume-data-pdf`, nên chưa kiểm chứng được chất lượng tiếng Việt.

## Cách đo

- Máy: MacBook M1 Pro, 16GB RAM. Docker và các ứng dụng khác vẫn chạy, nên đây là số đo trong điều kiện máy bận và đang swap.
- Dữ liệu: 10 CV ngành IT từ `lhoestq/resumes-raw-pdf-for-ocr`, chọn cố định bằng seed 42: 3 tiếng Việt, 3 pha Việt–Anh, 4 tiếng Anh.
- Mỗi CV gồm 6 lượt gọi: 1 trích xuất và 5 tiêu chí. Mỗi lượt gửi toàn bộ CV, chưa dùng retrieval.
- Cấu hình: Ollama, JSON schema, `think: false`, temperature 0, `num_ctx` 8192.

## LLM

| Chỉ số | 8B, prompt 1 | 14B, prompt 1 | 8B, prompt 2 | 14B, prompt 2 |
|---|---:|---:|---:|---:|
| JSON đúng schema | 59/60 | 60/60 | 60/60 | 60/60 |
| Có thẻ `<think>` | 0 | 0 | 0 | 0 |
| Trích dẫn khớp nguyên văn | 63/78 (81%) | 40/48 (83%) | 86/114 (75%) | 114/141 (81%) |
| Kết luận thiếu trích dẫn khớp | 29/50 | 25/50 | 1/50 | 2/50 |
| Thời gian một CV, trung vị | 101s | 170s | 106s | 227s |
| Thời gian một CV, lâu nhất | 172s | 266s | 198s | 341s |
| Token/giây, trung vị | 19.1 | 10.2 | 19.4 | 9.6 |
| RAM trống thấp nhất | 1.08GB | 0.50GB | 1.41GB | 0.58GB |

Prompt 2 buộc model chép bằng chứng trước khi kết luận, và không có bằng chứng thì phải là `unknown`.

Hai bản chỉ cùng mức ở 22/50 tiêu chí với prompt 2. Trường hợp lệch nhiều nhất là 8B chọn `partial` còn 14B chọn `unknown` (19 lần). Khi đọc mẫu ba CV, 8B thường suy diễn từ trích dẫn không liên quan, ví dụ coi "làm việc với khách hàng" là bằng chứng về cloud. 7 lượt của 8B để trống `rationale`; 14B không có lượt nào.

Đây là nhận xét từ việc đọc mẫu, không phải độ chính xác đo trên nhãn.

## Thành phần khác

- **`bge-m3`:** vector 1024 chiều, 13.7 đoạn/giây.
- **`bge-reranker-v2-m3`:** trên MPS, nạp model 32 giây, xếp hạng 30 cặp mất 1.4–3.5 giây.
- **Chất lượng retrieval:** chưa đánh giá, vì chỉ có 71 đoạn và không có nhãn.
- **OCR:** chưa kết luận được. Dataset chỉ có ảnh khoảng 594×841 pixel, quá thấp so với mức 200–300 DPI nên dùng, và độ tương đồng dao động từ 0.07 đến 0.86. Cần thử lại ở M4 với PDF render độ phân giải cao.

## Giới hạn

- 10 CV và một JD là quá ít để đại diện, chỉ đủ để quyết định có đi tiếp hay không.
- Mỗi cấu hình chỉ chạy một lần với seed cố định.
- Thời gian chưa phản ánh hệ thống thật, vì hệ thống thật chỉ gửi các đoạn đã truy xuất thay vì cả CV.
- Dataset không ghi license và có vẻ chứa thông tin cá nhân thật, nên chỉ dùng local, không commit, không đưa vào seed demo hay ảnh chụp luận văn.

## Chạy lại trên PDF Kaggle

- **Dữ liệu:** `hadikp/resume-data-pdf`, license MIT, giữ 4.306 PDF thuộc 51 thư mục trong `spikes/m1/kaggle_keep.txt`.
- **Định dạng:** 60/60 file mẫu chỉ chứa ảnh, không có lớp text, nên mọi CV phải qua OCR. 8/8 file OCR thử không có tiếng Việt.
- **Cách đo:** 10 CV (7 kỹ thuật, 3 kinh doanh) đọc bằng Tesseract `vie+eng` ở 200 DPI, chạy Qwen3 14B với prompt 2.

| Chỉ số | Từng tiêu chí | Gộp 5 tiêu chí |
|---|---:|---:|
| JSON đúng schema | 60/60 | 10/10 |
| Trích dẫn khớp nguyên văn | 113/130 (87%) | 17/27 (63%) |
| Thời gian một CV, trung vị | 169s | 26s |
| Thời gian một CV, lâu nhất | 244s | 47s |

Bản từng tiêu chí gồm cả trích xuất; bản gộp chỉ gồm chấm tiêu chí, chưa tính trích xuất và OCR. Bản gộp chỉ cùng mức với bản từng tiêu chí ở 26/50 tiêu chí. Chưa có nhãn để biết bản nào đúng hơn.
