# Hướng dẫn gán nhãn evaluation set

Mục đích: tạo nhãn độc lập (blind labelling) cho từng cặp CV/JD và evidence theo từng criterion để đánh giá retrieval và assessment. Đọc JD tương ứng và toàn bộ normalized text; không xem system output trước hoặc trong khi gán nhãn. Nhóm kỳ vọng trong set chỉ dùng chọn mẫu, không phải nhãn. Không suy diễn kỹ năng, bằng cấp hay kinh nghiệm không được chứng minh.

## Level

- `strong`: bằng chứng rõ, có kết quả hoặc phạm vi cụ thể. Ví dụ: xây REST API phục vụ 10.000 người dùng.
- `adequate`: bằng chứng rõ ràng, ở mức đạt yêu cầu. Ví dụ: mô tả đã thiết kế và xây REST API.
- `partial`: bằng chứng một phần. Ví dụ: chỉ mô tả hỗ trợ kiểm thử REST API.
- `absent`: có bằng chứng cho thấy không đạt. Ví dụ: CV ghi rõ chưa từng xây REST API.
- `unknown`: CV không đề cập. Ví dụ: không nói gì về REST API.
- `needs_review`: mâu thuẫn, OCR kém hoặc độ tin cậy thấp. Ví dụ: hai dòng kinh nghiệm mâu thuẫn về việc đã xây REST API.

**Không đề cập ≠ không đạt**: dùng `unknown` khi không được nhắc đến; chỉ dùng `absent` khi có bằng chứng cho thấy yêu cầu không đạt. Dùng `needs_review` khi bằng chứng mâu thuẫn, OCR không đọc được hoặc không đủ tin cậy; ghi lý do trong note. OCR kém không phải lỗi của ứng viên.

## Evidence và cách điền

Mở `data/eval/labels/<sheet-id>__<jd-id>.yaml` và text được xác định bởi `text_sha256` tại `data/eval/text/<sha>.txt`. Điền `labeler`, `labeled_at` theo định dạng ISO 8601 (`YYYY-MM-DD`), `overall_fit`, rồi `level`, `evidence`, `note` cho từng criterion. Evidence là danh sách các object có `quote`; sao chép nguyên văn từ text file, không rút gọn bằng `...`, có thể ghi nhiều quote. Không dùng số chunk. Có thể thêm `start_offset` và `end_offset`; nếu có, cả hai là chỉ số ký tự nửa mở `[start, end)` vào chính text file, sao cho `text[start_offset:end_offset] == quote`. Các level ngoài `unknown` và `needs_review` phải có evidence hợp lệ. Ghi giải thích, mâu thuẫn hoặc thông tin cần làm rõ vào `note`; không đưa suy đoán vào đó.

`overall_fit` là đánh giá tổng thể đối với JD: `good` khi bằng chứng cho thấy đáp ứng tốt các yêu cầu chính; `partial` khi chỉ đáp ứng một phần hoặc còn thiếu thông tin đáng kể; `poor` khi bằng chứng cho thấy không đáp ứng các yêu cầu chính. Cân nhắc priority và nêu lý do trong note liên quan; không coi thông tin không được đề cập là bằng chứng không đạt. Weights trong hai JD là giá trị minh họa do delegate của Dylan đặt; chưa được hiệu chỉnh.

## Ví dụ hoàn chỉnh (dữ liệu tự tạo)

Giả sử toàn bộ text file là `Built REST APIs for 100 clients.` và đang gán criterion `api_design` của JD-A. Nhãn criterion ví dụ:

```yaml
api_design:
  level: strong
  evidence:
    - quote: 'Built REST APIs for 100 clients.'
      start_offset: 0
      end_offset: 32
  note: 'Có phạm vi cụ thể.'
```

Đây chỉ là ví dụ cho một criterion; cần đánh giá các criterion còn lại trước khi chọn `overall_fit`.
