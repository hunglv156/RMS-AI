import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type {
  InputSnapshot,
  Manifest,
  ScreeningEnvelope,
} from "@rms-ai/contracts";
export const hash = (value: string | Buffer) =>
  createHash("sha256").update(value).digest("hex");
export function canonical(value: any): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.keys(value)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonical(value[k])}`)
      .join(",")}}`;
  return JSON.stringify(value);
}
// Match the existing Python pipeline's json.dumps(sort_keys=True) JD digest.
export function jdHash(jd: unknown): string {
  const ascii = (s: string) =>
    JSON.stringify(s).replace(
      /[\u007f-\uffff]/g,
      (c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"),
    );
  const encode = (v: any, key = ""): string => {
    if (typeof v === "string") return ascii(v);
    if (typeof v === "number" && key === "weight") {
      const n = Math.abs(v);
      let out =
        n !== 0 && (n < 0.0001 || n >= 1e16) ? v.toExponential() : String(v);
      if (out.includes("e"))
        out = out.replace(
          /e([+-]?)([0-9]+)$/,
          (_, sign, digits) => `e${sign || "+"}${digits.padStart(2, "0")}`,
        );
      else if (Number.isInteger(v)) out += ".0";
      return out;
    }
    if (Array.isArray(v)) return `[${v.map((x) => encode(x)).join(", ")}]`;
    if (v && typeof v === "object")
      return `{${Object.keys(v)
        .sort()
        .map((k) => `${ascii(k)}: ${encode(v[k], k)}`)
        .join(", ")}}`;
    return JSON.stringify(v);
  };
  return hash(encode(jd));
}
const schemas = JSON.parse(
  readFileSync(
    resolve(dirname(require.resolve("@rms-ai/contracts")), "../openapi.json"),
    "utf8",
  ),
).components.schemas;
/** Validate the frozen shared schema rather than maintain a second AI DTO. */
export function matches(schema: any, v: any): boolean {
  if (schema.$ref) return matches(schemas[schema.$ref.split("/").pop()], v);
  if (schema.anyOf && !schema.anyOf.some((s: any) => matches(s, v)))
    return false;
  if (
    schema.oneOf &&
    schema.oneOf.filter((s: any) => matches(s, v)).length !== 1
  )
    return false;
  if (schema.enum && !schema.enum.includes(v)) return false;
  const types = Array.isArray(schema.type)
    ? schema.type
    : schema.type
      ? [schema.type]
      : [];
  if (
    types.length &&
    !types.some((t: string) =>
      t === "null"
        ? v === null
        : t === "array"
          ? Array.isArray(v)
          : t === "object"
            ? v !== null && typeof v === "object" && !Array.isArray(v)
            : t === "integer"
              ? Number.isInteger(v)
              : t === "number"
                ? typeof v === "number" && Number.isFinite(v)
                : typeof v === t,
    )
  )
    return false;
  if (
    typeof v === "number" &&
    (v < (schema.minimum ?? -Infinity) || v > (schema.maximum ?? Infinity))
  )
    return false;
  if (
    typeof v === "string" &&
    (v.length < (schema.minLength ?? 0) ||
      v.length > (schema.maxLength ?? Infinity) ||
      (schema.pattern && !new RegExp(schema.pattern).test(v)))
  )
    return false;
  if (
    Array.isArray(v) &&
    (v.length < (schema.minItems ?? 0) ||
      v.length > (schema.maxItems ?? Infinity) ||
      (schema.items && !v.every((x) => matches(schema.items, x))))
  )
    return false;
  if (v && typeof v === "object" && !Array.isArray(v)) {
    if ((schema.required ?? []).some((k: string) => !(k in v))) return false;
    for (const [k, x] of Object.entries(v)) {
      if (schema.properties?.[k]) {
        if (!matches(schema.properties[k], x)) return false;
      } else if (schema.additionalProperties === false) return false;
      else if (
        typeof schema.additionalProperties === "object" &&
        !matches(schema.additionalProperties, x)
      )
        return false;
    }
  }
  return true;
}
export function validManifest(v: any): v is Manifest {
  if (!matches(schemas.Manifest, v)) return false;
  const { fingerprint, ...rest } = v;
  return fingerprint === hash(canonical(rest));
}
export class ExecutionError extends Error {
  constructor(
    readonly code: string,
    readonly retryable = false,
  ) {
    super(code);
  }
}
export function validateEnvelope(
  v: any,
  input: InputSnapshot,
): ScreeningEnvelope {
  const fail = () => {
    throw new ExecutionError("provenance_mismatch");
  };
  if (!matches(schemas.ScreeningEnvelope, v))
    throw new ExecutionError("schema_mismatch");
  if (
    !validManifest(v.manifest) ||
    canonical(v.manifest) !== canonical(input.manifest) ||
    v.fingerprint !== input.manifest.fingerprint
  )
    fail();
  const source = v.source,
    points = Array.from(source.text);
  if (
    !source.text.trim() ||
    hash(source.text) !== source.normalized_text_sha256 ||
    source.normalized_text_sha256 !== v.screening.versions.cv_sha256 ||
    source.extractor_version !== input.manifest.parser.version ||
    source.normalization_version !==
      input.manifest.parser.normalization_version ||
    v.screening.versions.jd_sha256 !== jdHash(input.jd) ||
    v.screening.jd_id !== input.jd.id ||
    v.screening.criteria.length !== input.jd.criteria.length
  )
    fail();
  let end = 0;
  for (const page of source.pages) {
    if (
      !Number.isInteger(page.start_offset) ||
      !Number.isInteger(page.end_offset) ||
      page.start_offset < end ||
      page.end_offset < page.start_offset ||
      page.end_offset > points.length ||
      !Number.isInteger(page.page_number) ||
      page.page_number < 1
    )
      fail();
    end = page.end_offset;
  }
  const seen = new Set();
  for (const c of v.screening.criteria) {
    const expected = input.jd.criteria.find(
      (x) => x.code === c.assessment.criterion_id,
    );
    if (
      !expected ||
      seen.has(c.assessment.criterion_id) ||
      c.scoring.criterion_id !== expected.code ||
      c.scoring.weight !== expected.weight ||
      c.scoring.priority !== expected.priority
    )
      fail();
    seen.add(c.assessment.criterion_id);
    for (const e of c.evidence)
      if (e.verification.valid) {
        const a = e.verification.start_offset,
          b = e.verification.end_offset;
        if (
          !Number.isInteger(a) ||
          !Number.isInteger(b) ||
          a < 0 ||
          b <= a ||
          b > points.length ||
          points.slice(a, b).join("") !== e.evidence.quote
        )
          fail();
      }
  }
  const t = v.screening.total;
  if (
    t.lower_bound > t.upper_bound ||
    (t.score_state === "insufficient_coverage" &&
      (t.observed_score !== null || !t.requires_manual_review))
  )
    fail();
  return v;
}
