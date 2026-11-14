# Benchmark sàng lọc M4.4 (2026-11-14)

Hệ thống thật: upload → hàng đợi → trích xuất → chấm gộp 5 tiêu chí (Qwen3 14B qua Ollama, `think: false`). Mỗi CV được sàng lọc tuần tự sau khi tài liệu đã `ready`; thời gian là từ lúc tạo run đến lúc `completed`, gồm một lượt LLM và ghi DB.
Tài liệu: 5 CV Kaggle, 236s từ upload đến khi tất cả `ready` (gồm OCR và trích xuất).

| Tiêu chí | Ngưỡng | Kết quả | Đạt |
|---|---|---|---|
| Trung vị thời gian một CV | ≤ 40s | 49.8s (lâu nhất 57.3s) | ❌ |
| JSON hợp lệ | 100% | 5/5 lượt hoàn tất (0 lượt phải gọi lại) | ✅ |
| Trích dẫn khớp nguyên văn | ≥ 85% | 27/30 (90%) | ✅ |
| Kết luận thiếu bằng chứng hợp lệ | 0 | 0 | ✅ |

| CV | Trạng thái | Giây | Điểm | Độ phủ | Mức theo tiêu chí |
|---|---|---:|---:|---:|---|
| data/Blockchain resumes/Image_11.pdf | completed | 32.5 | – | 0.3 | backend=adequate, database=needs_review, cloud=unknown, teamwork=unknown, english=unknown |
| data/Designer/163.pdf | completed | 39.4 | – | 0.25 | backend=unknown, database=unknown, cloud=unknown, teamwork=adequate, english=adequate |
| data/ETL Developer/116.pdf | completed | 56.8 | 63.33 | 0.9 | backend=adequate, database=adequate, cloud=partial, teamwork=adequate, english=needs_review |
| data/Information Technology/33.pdf | completed | 57.3 | 60.62 | 0.8 | backend=adequate, database=partial, cloud=unknown, teamwork=adequate, english=adequate |
| data/React Developer/72.pdf | completed | 49.8 | 70 | 0.9 | backend=adequate, database=adequate, cloud=adequate, teamwork=adequate, english=unknown |

Giới hạn: 5 CV, mỗi CV một lần chạy; chưa có nhãn nên chưa đo độ đúng của mức đánh giá. Số "trích dẫn khớp" tính trên mọi trích dẫn model trả về, trước khi loại trích dẫn sai.

## Nhận xét

- **Chưa đạt ngưỡng thời gian** (trung vị 49.8s so với 40s). Ba tiêu chí còn lại đạt.
- Điều kiện đo: lúc đo, swap đã dùng khoảng 18GB trên 19GB và RAM trống gần như bằng 0 (Qwen3 14B chiếm khoảng 10GB), tức là máy đang bận như các lần đo spike. Chưa thử chạy lại trên máy trống, nên chưa biết bao nhiêu phần của độ trễ là do swap.
- Thời gian gần như toàn bộ nằm ở lượt LLM (`llm_seconds` sát `seconds` ở CV đầu: 31.7s trên 32.5s), không phải ở NestJS hay ghi DB.
- Cách giảm đã biết nhưng chưa làm: rút `rationale` hoặc số trích dẫn tối đa mỗi tiêu chí (đầu ra chiếm phần lớn thời gian), hoặc chỉ chấm tiêu chí còn `needs_review`. Cả hai đổi prompt/schema nên cần đo lại chất lượng.

## Thử nghiệm rút đầu ra (2026-11-15, không giữ lại)

Thử `assess-batch-v2`: `rationale` ≤ 140 ký tự, tối đa 1 trích dẫn ≤ 200 ký tự mỗi tiêu chí, thêm dòng dặn ngắn gọn trong prompt. Cùng 5 CV, cùng 5 tiêu chí, một lần chạy.

| Chỉ số | v1 (giữ) | v2 (bỏ) |
|---|---|---|
| Trung vị thời gian | 49.8s | 41.8s (lâu nhất 46.1s) |
| Trích dẫn khớp nguyên văn | 27/30 (90%) | 14/18 (78%) |
| Độ phủ CV `Information Technology/33` | 0.8 | 0.25 (3 tiêu chí thành `needs_review`) |
| JSON hợp lệ, kết luận thiếu bằng chứng | 5/5, 0 | 5/5, 0 |

Kết luận: v2 nhanh hơn khoảng 16% nhưng vẫn chưa tới 40s, đồng thời làm tụt tỷ lệ trích dẫn khớp xuống dưới ngưỡng 85% và làm mất kết luận ở một CV. Giữ v1 (`assess-batch-v1`). Lần đo này cũng chạy khi swap gần đầy (khoảng 15.7GB trên 16GB), nên độ trễ chưa phải số của máy trống. Hướng còn lại chưa thử: chỉ chấm lại tiêu chí `needs_review`, hoặc đo trên máy không bị swap.
