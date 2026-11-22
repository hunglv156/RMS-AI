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

## Additional evaluation JDs

`jd-py-real` (Enveritas Backend Software Engineer - Python/Postgres) and `jd-hr-real` (Surmodics HR Generalist) are sourced from real job postings; see `data/eval/jds/sources/` for provenance. The existing `jd-a` and `jd-b` remain unchanged for reproducibility of earlier runs.

## v1.1 clarifications (2026-11-22)

Các quy tắc sau bổ sung cho v1 và được ưu tiên áp dụng khi có xung đột; phần v1 ở trên giữ nguyên. Các ví dụ là dữ liệu tự tạo.

1. **Criterion về kinh nghiệm (số năm, vai trò, lĩnh vực)**: nếu CV có lịch sử làm việc kèm mốc thời gian và không vai trò nào được liệt kê liên quan đến criterion, dùng `absent` và trích các mục (hoặc tiêu đề) lịch sử làm việc cho thấy điều đó; nếu CV không có lịch sử làm việc kèm mốc thời gian, dùng `unknown`. Ví dụ: với criterion "7 năm backend software engineer", CV chỉ ghi `Accountant, 01/2015 to Current` và `Bookkeeper, 2012 to 2014` → `absent`, trích hai dòng đó; CV chỉ có phần tóm tắt và kỹ năng, không có mốc thời gian → `unknown`.
2. **Criterion về học vấn**: nếu CV nêu bằng cấp và ngành của bằng không khớp với criterion, dùng `absent` và trích dòng bằng cấp; nếu CV không nêu bằng cấp, dùng `unknown`. Ví dụ: criterion "Bachelor’s degree in computer science", CV ghi `Bachelor of Arts: History` → `absent`, trích dòng đó; CV không có mục học vấn → `unknown`.
3. **Criterion về kỹ năng/công cụ**: không được đề cập vẫn là `unknown` (giữ nguyên như v1). Ví dụ: CV của kế toán không nhắc đến Docker → criterion Docker là `unknown`, không phải `absent`.
4. **`strong`** đòi hỏi quote có phạm vi hoặc kết quả cụ thể (con số, quy mô, quyền sở hữu/chịu trách nhiệm chính); nếu không, dùng `adequate`. Ví dụ: `Led recruiting for 40 open positions per year` → `strong`; `Managed full-cycle recruiting` → `adequate`.
5. **`overall_fit`**: `poor` nếu không có criterion `must_have` nào có bằng chứng ở mức `partial` trở lên; `good` nếu mọi criterion `must_have` đều là `adequate` hoặc `strong`; các trường hợp còn lại là `partial`. Ví dụ: JD có bốn `must_have` với level `unknown`, `absent`, `unknown`, `absent` → `poor`; `strong`, `adequate`, `adequate`, `adequate` → `good`; `adequate`, `partial`, `unknown`, `strong` → `partial`.

## v1.2 — quy ước phạm vi dùng khi phân xử (2026-11-22)

Mục này ghi lại các quy ước phạm vi được áp dụng trong hai bản phân xử; v1.2 được viết sau khi gán nhãn để ghi nhận cách phân xử, không được dùng bởi người gán nhãn.

- **Quy tắc 1** chỉ áp dụng cho tiêu chí kinh nghiệm theo thời gian/vai trò như `backend_experience` và `hr_experience`; vai trò liên quan nhưng chưa đủ yêu cầu là `partial`. Ví dụ: khoảng 6 năm PHP backend khi yêu cầu 7 năm → `partial`. (Nguồn: `data/eval/labels-silver/final/ADJUDICATION.md`; `data/eval/heldout/labels-silver/final/ADJUDICATION.md`)
- **Quy tắc 3** bao gồm tiêu chí hoạt động/kỹ năng có thể làm ngoài vai trò HR, gồm `talent_acquisition`, `employee_relations_compliance` và `hr_programs`; không được nhắc đến → `unknown`, không suy ra `absent` từ lịch sử nghề nghiệp. Ví dụ: CV chỉ có vai trò kỹ thuật và không nhắc tuyển dụng → `talent_acquisition: unknown`. (Nguồn: cả hai bản `ADJUDICATION.md` nêu trên)
- Công việc chuyên môn cho một nhóm HR không tự nó là kinh nghiệm HR hoặc thực hiện hoạt động tuyển dụng; đóng góp kỹ thuật cho một sáng kiến HR có thể là `partial` ở `hr_programs`. Ví dụ: kỹ sư xây công cụ xếp hạng ứng viên → không tính là HR experience hay tuyển dụng; có thể tính `hr_programs: partial`. (Nguồn: `data/eval/heldout/labels-silver/final/ADJUDICATION.md`)
- Với tiêu chí học vấn ngành CS, bằng ngành gần kề nhưng không phải CS/kỹ thuật phần mềm được chấm `partial`; bằng ghi rõ nhưng không liên quan là `absent`. Ví dụ: Electronics & Communication Engineering → `partial` cho tiêu chí CS. (Nguồn: cả hai bản `ADJUDICATION.md` nêu trên)
- Nếu có bằng cấp nhưng không nêu ngành, dùng `unknown` cho tiêu chí học vấn cần ngành cụ thể. Ví dụ: chỉ ghi “Bachelor of Science” → `unknown` cho tiêu chí bằng CS. (Nguồn: `data/eval/labels-silver/final/ADJUDICATION.md`)
- Với kinh nghiệm backend, DBA thuần túy chỉ làm cài đặt, tinh chỉnh, sao lưu và giám sát cơ sở dữ liệu không được tính là kinh nghiệm kỹ thuật phần mềm backend. Ví dụ: lịch sử chỉ có vai trò Database Administrator với các nhiệm vụ này không chứng minh `backend_experience`. (Nguồn: `data/eval/heldout/labels-silver/final/ADJUDICATION.md`)
- Giải thích vấn đề chuyên môn hoặc kỹ thuật cho người không chuyên được tính là `adequate` ở tiêu chí giao tiếp, dù nội dung không phải kỹ thuật; giao tiếp chung hoặc với khách hàng/bán hàng đơn thuần là `partial`. Ví dụ: giải thích lỗi thanh toán cho bộ phận kinh doanh → `adequate`. (Nguồn: cả hai bản `ADJUDICATION.md` nêu trên)
- Với tiêu chí gồm nhiều thành phần, chấm `adequate` khi phần lớn thành phần được chứng minh rõ ràng qua thực hành; chỉ một phần nhỏ, hoặc chỉ có trong danh sách kỹ năng/môi trường, là `partial`. Ví dụ: có Linux, Bash và AWS thực hành trong tiêu chí Linux/Bash/Docker/AWS, nhưng thiếu Docker → `adequate`. (Nguồn: `data/eval/heldout/labels-silver/final/ADJUDICATION.md`)
