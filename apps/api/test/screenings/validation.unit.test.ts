import { test } from "node:test";
import assert from "node:assert/strict";
import {
  canonical,
  hash,
  validManifest,
  validateEnvelope,
} from "../../src/screenings/validation";
import { manifest, envelope } from "./support";
const input: any = {
  jd: {
    id: "jd",
    criteria: [{ code: "python", weight: 1, priority: "must_have" }],
  },
  manifest: manifest(),
};
test("canonical identity, full manifest integrity and shape", () => {
  assert.equal(
    canonical({ z: 1, a: { b: 2, a: 1 } }),
    canonical({ a: { a: 1, b: 2 }, z: 1 }),
  );
  assert(validManifest(manifest()));
  assert(!validManifest({ ...manifest(), mode: "live" }));
  assert(!validManifest({ fingerprint: hash("x") }));
});
test("envelope enforces schema, hash, criterion identity, config and Unicode quote bounds", () => {
  const e: any = envelope(input);
  assert.equal(validateEnvelope(e, input), e);
  for (const mutate of [
    (v: any) => {
      v.source.text += "changed";
    },
    (v: any) => {
      v.screening.criteria[0].scoring.weight = 2;
    },
    (v: any) => {
      v.screening.jd_id = "wrong";
    },
    (v: any) => {
      v.fingerprint = "wrong";
    },
    (v: any) => {
      delete v.screening.llm;
    },
    (v: any) => {
      v.source.pages[0].end_offset = 1000;
    },
  ]) {
    const v = structuredClone(e);
    mutate(v);
    assert.throws(() => validateEnvelope(v, input));
  }
  const v = structuredClone(e);
  v.screening.criteria[0].evidence = [
    {
      evidence: { quote: "😀" },
      verification: {
        valid: true,
        ambiguous: false,
        start_offset: 10,
        end_offset: 11,
      },
    },
  ];
  assert.equal(validateEnvelope(v, input), v);
  v.screening.criteria[0].evidence[0].verification.end_offset = 12;
  assert.throws(() => validateEnvelope(v, input));
});

test("JD digest agrees with existing Python Unicode and float serialization", async () => {
  const { jdHash } = await import("../../src/screenings/validation");
  const vectors: [
    [number, string],
    [number, string],
    [number, string],
    [number, string],
    [number, string],
  ] = [
    [1, "ad4ecebde3d7dab4c390d9b8907bd3bf197594eaf4e3f2fcb0ecae4a873508a6"],
    [1e-7, "0e395e12e7b1e71dcf3af0f7b917ef408dfe91cf221ab04cd6fff96eeb8ebd36"],
    [
      0.00001,
      "df3f77f50b25ef453687890b8a85713ceb0115b5d983b71dd955e07e2eb4f12b",
    ],
    [1e16, "e5f4f34745b308d9a42d592f948d571705ddaaca7fdc26e746f92df1979aff1a"],
    [1.25, "f44794ab5b5266e452479410e0bf1ebe41f5d3e28d03c65ba393c4f0e3dd85c8"],
  ];
  for (const [weight, expected] of vectors)
    assert.equal(
      jdHash({
        id: "jd",
        title: "Kỹ sư 😀",
        summary: "Demo",
        criteria: [
          {
            code: "python",
            label: "Python",
            description: "Experience",
            priority: "must_have",
            weight,
            keywords: [],
          },
        ],
      }),
      expected,
    );
});
