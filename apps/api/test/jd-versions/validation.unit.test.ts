import { test } from "node:test";
import assert from "node:assert/strict";
import { draftSchema, contentHash } from "../../src/jd-versions/validation";
export const draft = {
  title: "Engineer",
  summary: "Build useful tools",
  criteria: [
    {
      code: "python",
      label: "Python",
      description: "Python experience",
      priority: "must_have" as const,
      weight: 1,
      keywords: ["Python"],
    },
  ],
};
test("JD validation matches bounded unique criteria and finite positive total weight", () => {
  assert.ok(draftSchema.safeParse(draft).success);
  for (const criteria of [
    [],
    Array(9).fill(draft.criteria[0]),
    [...draft.criteria, ...draft.criteria],
    [{ ...draft.criteria[0], weight: 0 }],
    [{ ...draft.criteria[0], weight: -1 }],
    [{ ...draft.criteria[0], weight: NaN }],
    [{ ...draft.criteria[0], weight: Infinity }],
    [
      { ...draft.criteria[0], weight: Number.MAX_VALUE },
      { ...draft.criteria[0], code: "other", weight: Number.MAX_VALUE },
    ],
    [{ ...draft.criteria[0], code: " " }],
    [{ ...draft.criteria[0], priority: "unknown" }],
  ])
    assert.equal(draftSchema.safeParse({ ...draft, criteria }).success, false);
  assert.ok(
    draftSchema.safeParse({
      ...draft,
      criteria: Array.from({ length: 8 }, (_, i) => ({
        ...draft.criteria[0],
        code: String(i),
        weight: i === 0 ? 1 : 0,
      })),
    }).success,
  );
});
test("approval hash is stable across object property order and changes with content/order", () => {
  assert.equal(
    contentHash(draft),
    contentHash({
      ...draft,
      criteria: [
        {
          keywords: ["Python"],
          weight: 1,
          priority: "must_have",
          description: "Python experience",
          label: "Python",
          code: "python",
        },
      ],
    }),
  );
  assert.notEqual(
    contentHash(draft),
    contentHash({ ...draft, summary: "Different" }),
  );
});
