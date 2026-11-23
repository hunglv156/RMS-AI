import { createHash } from "node:crypto";
import { mkdir, writeFile, readFile, realpath, lstat } from "node:fs/promises";
import { resolve, join } from "node:path";
import type { Knex } from "knex";
import { manifest, envelope } from "./demo-envelope";
import { demoJds } from "./demo-jds";
import { canonical, hash, jdHash } from "../../screenings/validation";
const id = (name: string) => {
  const h = createHash("sha256").update(`t89:${name}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
};
export const demoIds = {
  job: id("job"),
  jd: id("jd"),
  application: id("application0"),
  hrJob: id("hr-job"),
  hrJd: id("hr-jd"),
};
/** Minimal real one-page PDF; all content is deliberately synthetic. */
export function demoPdf(lines: string[]) {
  const stream = `BT /F1 12 Tf 50 780 Td ${lines.map((s, i) => `${i ? "0 -22 Td " : ""}(${s.replace(/[\\()]/g, "\\$&")}) Tj`).join("\n")} ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((o, i) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((o) => `${String(o).padStart(10, "0")} 00000 n \n`)
    .join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf);
}
type Level = "strong" | "adequate" | "partial" | "absent" | "unknown";
/** Per-criterion plan: level plus indexes of CV lines quoted as evidence. */
type Plan = Record<string, [Level, number[]?]>;
const levelStatus = {
  strong: "supported",
  adequate: "supported",
  partial: "partially_supported",
  absent: "not_supported",
  unknown: "unknown",
} as const;
/** Port of apps/ai-service/app/scoring/engine.py score_criteria for archived fixtures. */
function scoreTotal(rows: any[], minCoverage: number) {
  const r2 = (n: number) => Math.round(n * 100) / 100;
  const total = rows.reduce((s, r) => s + r.weight, 0);
  const known = rows.filter(
    (r) => r.validated && r.match_value !== null && r.weight > 0,
  );
  const knownWeight = known.reduce((s, r) => s + r.weight, 0);
  const weighted = known.reduce((s, r) => s + r.weight * r.match_value, 0);
  const coverage = knownWeight / total;
  const scored = knownWeight > 0 && coverage >= minCoverage;
  const verified = new Set(
    known
      .filter((r) => r.status !== "not_supported")
      .map((r) => r.criterion_id),
  );
  return {
    score_state: scored ? "scored" : "insufficient_coverage",
    observed_score: scored ? r2((100 * weighted) / knownWeight) : null,
    coverage: Math.round(coverage * 10000) / 10000,
    lower_bound: r2((100 * weighted) / total),
    upper_bound: r2((100 * (weighted + total - knownWeight)) / total),
    requires_manual_review: rows.some(
      (r) =>
        r.weight > 0 &&
        r.priority === "must_have" &&
        !verified.has(r.criterion_id),
    ),
  };
}
const pythonCandidates: {
  name: string;
  lines: string[];
  plan?: Plan;
  decision?: { decision: string; note: string };
}[] = [
  {
    name: "Minh Anh (tổng hợp) · Bằng chứng rõ ràng",
    lines: [
      "SYNTHETIC DEMO CV - NOT A REAL PERSON",
      "Minh Anh - Backend Software Engineer",
      "Eight years of full-time professional experience as a backend software engineer.",
      "Built Python services with Django and Flask for data processing pipelines.",
      "Tuned PostgreSQL query performance and wrote stored procedures for reporting.",
      "Deployed Docker containers on AWS EC2 and RDS; daily Linux and Bash scripting.",
      "Applied design patterns to split a monolith into modular services.",
      "Mentored two junior engineers and wrote design documents for the team.",
      "B.Sc. in Computer Science.",
    ],
    plan: {
      python_frameworks: ["strong", [3]],
      postgresql_database: ["adequate", [4]],
      cloud_docker_linux: ["adequate", [5]],
      backend_experience: ["strong", [2]],
      software_architecture: ["partial", [6]],
      communication_collaboration: ["adequate", [7]],
      education_cs: ["strong", [8]],
    },
    decision: {
      decision: "shortlist",
      note: "Bằng chứng Python, PostgreSQL và AWS đều trích từ CV gốc. Phỏng vấn để xác nhận phạm vi tự thiết kế kiến trúc.",
    },
  },
  {
    name: "Quốc Bảo (tổng hợp) · Cần người xem lại",
    lines: [
      "SYNTHETIC DEMO CV - NOT A REAL PERSON",
      "Quoc Bao - Python Developer",
      "Six years as a backend software engineer in full-time roles.",
      "Develops Flask APIs and Python batch jobs.",
      "Uses MongoDB for document storage.",
      "Some Docker usage on local Linux machines.",
      "Presents sprint demos to stakeholders.",
    ],
    plan: {
      python_frameworks: ["adequate", [3]],
      postgresql_database: ["absent"],
      cloud_docker_linux: ["partial", [5]],
      backend_experience: ["partial", [2]],
      software_architecture: ["unknown"],
      communication_collaboration: ["adequate", [6]],
      education_cs: ["unknown"],
    },
  },
  {
    name: "Thu Hà (tổng hợp) · Thiếu căn cứ",
    lines: [
      "SYNTHETIC DEMO CV - NOT A REAL PERSON",
      "Thu Ha - Software Engineer",
      "Experience details available on request.",
    ],
  },
  {
    name: "Gia Huy (tổng hợp) · Lỗi nhà cung cấp",
    lines: [
      "SYNTHETIC DEMO CV - NOT A REAL PERSON",
      "Gia Huy - Backend Engineer",
      "Python and PostgreSQL services for an internal platform.",
    ],
  },
];
const hrCandidates = [
  {
    name: "Lan Chi (tổng hợp) · Chờ JD được duyệt",
    lines: [
      "SYNTHETIC DEMO CV - NOT A REAL PERSON",
      "Lan Chi - HR Generalist",
      "Five years of HR operations, onboarding and recruiting coordination.",
    ],
  },
  {
    name: "Đức Minh (tổng hợp) · Chờ JD được duyệt",
    lines: [
      "SYNTHETIC DEMO CV - NOT A REAL PERSON",
      "Duc Minh - People Operations",
      "Maintains HRIS records and supports employee relations cases.",
    ],
  },
];
export async function seedDemo(db: Knex, storageRoot: string) {
  const root = resolve(storageRoot);
  await mkdir(root, { recursive: true, mode: 0o700 });
  if ((await realpath(root)) !== root || (await lstat(root)).isSymbolicLink())
    throw new Error("Demo storage must be a canonical nonsymlink path");
  const admin = "00000000-0000-4000-8000-000000000001",
    recruiter = "00000000-0000-4000-8000-000000000002",
    reviewer = "00000000-0000-4000-8000-000000000003";
  const asJd = (jdId: string, spec: (typeof demoJds)["python"]) => ({
    id: jdId,
    title: spec.title,
    summary: spec.summary,
    criteria: spec.criteria.map((c) => ({ ...c, keywords: [...c.keywords] })),
  });
  const jd = asJd(demoIds.jd, demoJds.python);
  const hrJd = asJd(demoIds.hrJd, demoJds.hr);
  const m = manifest();
  const all = [
    ...pythonCandidates.map((c, i) => ({ ...c, key: `${i}` })),
    ...hrCandidates.map((c, i) => ({ ...c, key: `hr${i}` })),
  ];
  // Verify/write immutable bytes before DB links. Never overwrite an existing storage object.
  const files = new Map<string, { bytes: Buffer; key: string }>();
  for (const c of all) {
    const bytes = demoPdf(c.lines),
      key = id(`file${c.key}`),
      path = join(root, key);
    try {
      await writeFile(path, bytes, { flag: "wx", mode: 0o600 });
    } catch (e: any) {
      if (e.code !== "EEXIST") throw e;
      if (
        (await lstat(path)).isSymbolicLink() ||
        !(await readFile(path)).equals(bytes)
      )
        throw new Error("Demo storage collision; existing data preserved");
    }
    files.set(c.key, { bytes, key });
  }
  await db.transaction(async (tx) => {
    await tx.raw("select pg_advisory_xact_lock(hashtext('t89-demo-seed'))");
    if (await tx("jobs").where({ id: demoIds.job }).first()) return;
    const insertJd = async (
      jobId: string,
      v: ReturnType<typeof asJd>,
      prefix: string,
    ) => {
      await tx("jd_versions").insert({
        id: v.id,
        job_id: jobId,
        version_no: 1,
        title: v.title,
        summary: v.summary,
        created_by: recruiter,
      });
      await tx("job_criteria").insert(
        v.criteria.map(({ keywords, ...c }, i) => ({
          id: id(`${prefix}criterion${i}`),
          jd_version_id: v.id,
          ...c,
          keywords_json: JSON.stringify(keywords),
          sort_order: i,
        })),
      );
    };
    for (const [jobId, title] of [
      [demoIds.job, `${jd.title} · Demo`],
      [demoIds.hrJob, `${hrJd.title} · Demo`],
    ])
      await tx("jobs").insert({ id: jobId, title, created_by: recruiter });
    await tx("job_assignments").insert([
      { job_id: demoIds.job, user_id: reviewer, assigned_by: admin },
      { job_id: demoIds.hrJob, user_id: reviewer, assigned_by: admin },
    ]);
    await insertJd(demoIds.job, jd, "");
    await insertJd(demoIds.hrJob, hrJd, "hr");
    await tx("jd_versions")
      .where({ id: jd.id })
      .update({ state: "pending_approval" });
    await tx("jd_versions")
      .where({ id: jd.id })
      .update({
        state: "approved",
        submitted_by: recruiter,
        submitted_at: new Date(),
        approved_by: reviewer,
        approved_at: new Date(),
        content_sha256: jdHash(jd),
        revision: 3,
      });
    await tx("jobs")
      .where({ id: demoIds.job })
      .update({ active_jd_version_id: jd.id });
    await tx("screening_configs")
      .insert({
        id: id("config"),
        fingerprint: m.fingerprint,
        effective_manifest_json: m,
      })
      .onConflict("fingerprint")
      .ignore();
    const config = await tx("screening_configs")
      .where({ fingerprint: m.fingerprint })
      .first();
    const criterionIds = new Map(
      jd.criteria.map((c, i) => [c.code, id(`criterion${i}`)]),
    );
    for (const c of all) {
      const { bytes, key } = files.get(c.key)!,
        hr = c.key.startsWith("hr"),
        jobId = hr ? demoIds.hrJob : demoIds.job,
        candidate = id(`candidate${c.key}`),
        resume = id(`resume${c.key}`),
        application = id(`application${c.key}`),
        run = id(`run${c.key}`),
        text = c.lines.join("\n");
      await tx("candidates").insert({
        id: candidate,
        display_name: c.name,
        provenance: "synthetic",
        created_by: recruiter,
      });
      await tx("resumes").insert({
        id: resume,
        candidate_id: candidate,
        version_no: 1,
        storage_key: key,
        original_filename: `synthetic-demo-${c.key}.pdf`,
        mime_type: "application/pdf",
        byte_size: bytes.length,
        file_sha256: hash(bytes),
        uploaded_by: recruiter,
      });
      await tx("applications").insert({
        id: application,
        job_id: jobId,
        candidate_id: candidate,
        resume_id: resume,
        created_by: recruiter,
      });
      // HR applications wait for their draft JD to be approved during the demo.
      if (hr) continue;
      const failed = c.name.includes("Lỗi");
      const plan = (c as { plan?: Plan }).plan;
      const result: any = envelope({ jd, manifest: m, text });
      if (plan) {
        const starts = c.lines.map((_, i) =>
          i ? Array.from(c.lines.slice(0, i).join("\n") + "\n").length : 0,
        );
        const rubric = m.scoring.rubric_values as Record<string, number>;
        for (const k of result.screening.criteria) {
          const [level, quoted = []] = plan[k.assessment.criterion_id];
          const known = level !== "unknown";
          const match = known ? rubric[level] : null;
          const quotes = quoted.map((i) => c.lines[i]);
          k.assessment = {
            ...k.assessment,
            level,
            confidence: known ? 0.9 : 0.4,
            reason: `SYNTHETIC ARCHIVE: predetermined ${level} evidence demonstration, not LLM inference`,
            evidence: quotes.map((quote) => ({ quote })),
            missing_information:
              level === "strong" || level === "adequate"
                ? []
                : [`Confirm ${k.scoring.criterion_id.replace(/_/g, " ")}`],
          };
          k.validation = {
            level,
            raw_level: level,
            reason: null,
            evidence_valid: known,
          };
          k.evidence = quoted.map((i) => ({
            evidence: { quote: c.lines[i] },
            verification: {
              valid: true,
              ambiguous: false,
              start_offset: starts[i],
              end_offset: starts[i] + Array.from(c.lines[i]).length,
            },
          }));
          k.scoring = {
            ...k.scoring,
            status: levelStatus[level],
            validated: known,
            match_value: match,
          };
          k.score = match === null ? null : Math.round(match * 10000) / 100;
          k.weighted_points =
            match === null
              ? null
              : Math.round(k.scoring.weight * match * 10000) / 10000;
        }
        result.screening.total = scoreTotal(
          result.screening.criteria.map((k: any) => k.scoring),
          m.scoring.min_coverage,
        );
      }
      const snapshot = {
        jd,
        criteria_mapping: jd.criteria.map((k) => ({
          criterion_id: criterionIds.get(k.code)!,
          code: k.code,
        })),
        resume: { id: resume, file_sha256: hash(bytes), storage_key: key },
        manifest: m,
      };
      await tx("screening_runs").insert({
        id: run,
        application_id: application,
        job_id: jobId,
        resume_id: resume,
        jd_version_id: jd.id,
        scoring_config_id: config.id,
        input_snapshot_json: snapshot,
        input_fingerprint: hash(canonical(snapshot)),
        requested_by: recruiter,
        status: failed ? "failed" : "running",
        attempt_count: failed ? 2 : 1,
        started_at: new Date(),
        finished_at: new Date(),
        result_json: failed ? null : result,
        normalized_source_text: failed ? null : text,
        source_pages_json: failed ? null : JSON.stringify(result.source.pages),
        normalized_text_sha256: failed ? null : hash(text),
        ...(failed
          ? {
              error_code: "config_changed",
              safe_error_detail:
                "Synthetic archived failure (demo fixture). Its frozen deterministic configuration no longer matches the running AI service.",
            }
          : result.screening.total),
      });
      if (!failed) {
        await tx("screening_criterion_results").insert(
          result.screening.criteria.map((k: any) => ({
            screening_run_id: run,
            criterion_id: criterionIds.get(k.assessment.criterion_id),
            criterion_code: k.assessment.criterion_id,
            raw_assessment_json: k.assessment,
            validated_json: k.validation,
            evidence_json: JSON.stringify(k.evidence),
            level: k.validation.level,
            status: k.scoring.status,
            match_value: k.scoring.match_value,
            weight: k.scoring.weight,
            confidence: k.assessment.confidence,
            reason: k.assessment.reason,
            missing_information_json: JSON.stringify(
              k.assessment.missing_information,
            ),
          })),
        );
        await tx("screening_runs")
          .where({ id: run })
          .update({ status: "completed" });
      }
      const decision = (c as { decision?: { decision: string; note: string } })
        .decision;
      if (decision) {
        await tx("human_reviews").insert({
          id: id(`review${c.key}`),
          application_id: application,
          screening_run_id: run,
          reviewer_id: reviewer,
          ...decision,
        });
        await tx("applications")
          .where({ id: application })
          .update({
            stage: decision.decision,
            current_review_id: id(`review${c.key}`),
            revision: 2,
          });
      }
      await tx("audit_events").insert({
        actor_id: admin,
        actor_type: "system",
        action: "demo.seeded",
        resource_type: "screening_run",
        resource_id: run,
        job_id: jobId,
        request_id: `t89-seed-${c.key}`,
        safe_metadata_json: {
          synthetic: true,
          mode: "deterministic",
          archived_fixture: true,
        },
      });
    }
  });
}
