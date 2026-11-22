import { z } from "zod";
export const jdSchema = z
  .object({
    id: z.string().trim().min(1, "Nhập mã vị trí."),
    title: z.string().trim().min(1, "Nhập tên vị trí."),
    summary: z.string(),
    criteria: z
      .array(
        z
          .object({
            code: z.string().trim().min(1, "Nhập mã tiêu chí."),
            label: z.string().trim().min(1, "Nhập tên tiêu chí."),
            description: z.string().trim().min(1, "Nhập mô tả tiêu chí."),
            priority: z.enum(["must_have", "nice_to_have"]),
            weight: z.number().finite().positive("Trọng số phải lớn hơn 0."),
            keywords: z.array(z.string()),
          })
          .strict(),
      )
      .min(1, "Cần ít nhất một tiêu chí.")
      .max(8, "Tối đa 8 tiêu chí."),
  })
  .strict()
  .refine(
    (jd) => new Set(jd.criteria.map((c) => c.code)).size === jd.criteria.length,
    "Mã tiêu chí không được trùng nhau.",
  );
export function validateJD(value: unknown): string[] {
  const result = jdSchema.safeParse(value);
  return result.success ? [] : result.error.issues.map((i) => i.message);
}
