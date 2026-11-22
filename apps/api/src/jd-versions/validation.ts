import { z } from "zod";
import { createHash } from "node:crypto";
const text = z.string().trim().min(1);
export const criterionSchema = z
  .object({
    code: text,
    label: text,
    description: text,
    priority: z.enum(["must_have", "nice_to_have"]),
    weight: z.number().finite().nonnegative(),
    keywords: z.array(z.string()),
  })
  .strict();
export const draftSchema = z
  .object({
    title: text,
    summary: z.string(),
    criteria: z
      .array(criterionSchema)
      .min(1)
      .max(8)
      .superRefine((criteria, ctx) => {
        const total = criteria.reduce((sum, c) => sum + c.weight, 0);
        if (!Number.isFinite(total) || total <= 0)
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Total weight must be finite and positive",
          });
        if (new Set(criteria.map((c) => c.code)).size !== criteria.length)
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Criterion codes must be unique",
          });
      }),
  })
  .strict();
export type Draft = z.infer<typeof draftSchema>;
// Explicit field order makes this hash stable across DB row/JSON property ordering.
export function contentHash(draft: Draft) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        title: draft.title,
        summary: draft.summary,
        criteria: draft.criteria.map((c) => ({
          code: c.code,
          label: c.label,
          description: c.description,
          priority: c.priority,
          weight: c.weight,
          keywords: c.keywords,
        })),
      }),
    )
    .digest("hex");
}
