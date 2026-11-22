import { useState } from "react";
import { Braces, ListFilter, Plus, Trash2 } from "lucide-react";
import type { JobDescription } from "../lib/api/types";
import { jdSchema } from "../lib/validation";
export const blankJD: JobDescription = {
  id: "vi-tri-moi",
  title: "",
  summary: "",
  criteria: [
    {
      code: "tieu_chi_1",
      label: "",
      description: "",
      priority: "must_have",
      weight: 1,
      keywords: [],
    },
  ],
};
export function JDEditor({
  jd,
  onChange,
  onValidity,
}: {
  jd: JobDescription;
  onChange: (jd: JobDescription) => void;
  onValidity: (valid: boolean) => void;
}) {
  const [raw, setRaw] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  function toggle(next: boolean) {
    if (next) {
      setDraft(JSON.stringify(jd, null, 2));
      setError("");
    } else {
      setError("");
      onValidity(true);
    }
    setRaw(next);
  }
  function editJSON(value: string) {
    setDraft(value);
    try {
      const parsed = jdSchema.safeParse(JSON.parse(value));
      if (!parsed.success)
        throw new Error(parsed.error.issues.map((i) => i.message).join(" "));
      onChange(parsed.data);
      setError("");
      onValidity(true);
    } catch (e) {
      setError(
        e instanceof SyntaxError
          ? "JSON chưa hợp lệ. Kiểm tra dấu ngoặc và dấu phẩy."
          : (e as Error).message,
      );
      onValidity(false);
    }
  }
  return (
    <div className="jd-editor">
      <div className="editor-tabs">
        <button type="button" aria-pressed={!raw} onClick={() => toggle(false)}>
          <ListFilter size={15} />
          Biểu mẫu
        </button>
        <button type="button" aria-pressed={raw} onClick={() => toggle(true)}>
          <Braces size={15} />
          JSON
        </button>
      </div>
      {raw ? (
        <>
          <label htmlFor="jd-json">Mô tả công việc dạng JSON</label>
          <textarea
            id="jd-json"
            className="json-input"
            spellCheck={false}
            value={draft}
            onChange={(e) => editJSON(e.target.value)}
            aria-invalid={!!error}
          />
          {error && (
            <p className="field-error" role="alert">
              {error} Chuyển về Biểu mẫu để bỏ thay đổi JSON chưa hợp lệ.
            </p>
          )}
        </>
      ) : (
        <>
          <label>
            Tên vị trí
            <input
              value={jd.title}
              onChange={(e) => onChange({ ...jd, title: e.target.value })}
              placeholder="Ví dụ: Backend Engineer"
            />
          </label>
          <label>
            Tóm tắt công việc
            <textarea
              value={jd.summary}
              onChange={(e) => onChange({ ...jd, summary: e.target.value })}
              rows={2}
            />
          </label>
          <div className="section-top">
            <h4>
              Tiêu chí đánh giá{" "}
              <span className="count">{jd.criteria.length}/8</span>
            </h4>
            <button
              type="button"
              className="text-button"
              disabled={jd.criteria.length >= 8}
              onClick={() =>
                onChange({
                  ...jd,
                  criteria: [
                    ...jd.criteria,
                    {
                      code: `tc_${crypto.randomUUID().slice(0, 8)}`,
                      label: "",
                      description: "",
                      priority: "must_have",
                      weight: 1,
                      keywords: [],
                    },
                  ],
                })
              }
            >
              <Plus size={15} />
              Thêm
            </button>
          </div>
          {jd.criteria.map((c, i) => (
            <details
              className="criterion-editor"
              key={c.code}
              open={jd.criteria.length === 1}
            >
              <summary>
                <span>
                  {i + 1}. {c.label || "Tiêu chí mới"}
                </span>
                <span className="muted text-xs">{c.weight} điểm</span>
              </summary>
              <div className="criterion-fields">
                <label>
                  Tên tiêu chí
                  <input
                    value={c.label}
                    onChange={(e) =>
                      onChange({
                        ...jd,
                        criteria: jd.criteria.map((v, n) =>
                          n === i ? { ...v, label: e.target.value } : v,
                        ),
                      })
                    }
                  />
                </label>
                <label>
                  Mô tả
                  <textarea
                    rows={3}
                    value={c.description}
                    onChange={(e) =>
                      onChange({
                        ...jd,
                        criteria: jd.criteria.map((v, n) =>
                          n === i ? { ...v, description: e.target.value } : v,
                        ),
                      })
                    }
                  />
                </label>
                <div className="field-row">
                  <label>
                    Mức ưu tiên
                    <select
                      value={c.priority}
                      onChange={(e) =>
                        onChange({
                          ...jd,
                          criteria: jd.criteria.map((v, n) =>
                            n === i
                              ? {
                                  ...v,
                                  priority: e.target.value as typeof c.priority,
                                }
                              : v,
                          ),
                        })
                      }
                    >
                      <option value="must_have">Bắt buộc</option>
                      <option value="nice_to_have">Ưu tiên</option>
                    </select>
                  </label>
                  <label>
                    Trọng số
                    <input
                      type="number"
                      min="0.01"
                      step="any"
                      value={Number.isNaN(c.weight) ? "" : c.weight}
                      onChange={(e) =>
                        onChange({
                          ...jd,
                          criteria: jd.criteria.map((v, n) =>
                            n === i
                              ? { ...v, weight: e.target.valueAsNumber }
                              : v,
                          ),
                        })
                      }
                    />
                  </label>
                </div>
                <label>
                  Từ khóa (phân cách bằng dấu phẩy)
                  <input
                    value={c.keywords.join(",")}
                    onChange={(e) =>
                      onChange({
                        ...jd,
                        criteria: jd.criteria.map((v, n) =>
                          n === i
                            ? { ...v, keywords: e.target.value.split(",") }
                            : v,
                        ),
                      })
                    }
                  />
                </label>
                <button
                  className="text-button danger"
                  type="button"
                  onClick={() =>
                    onChange({
                      ...jd,
                      criteria: jd.criteria.filter((_, n) => n !== i),
                    })
                  }
                >
                  <Trash2 size={14} />
                  Xóa tiêu chí
                </button>
              </div>
            </details>
          ))}
        </>
      )}
    </div>
  );
}
