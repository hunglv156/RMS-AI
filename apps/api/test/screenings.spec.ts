import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PipelineRuntime } from '../src/pipeline/pipeline-runtime';
import { S3Service } from '../src/storage/s3.service';
import { addMember, bearer, createTestApp, register, type Session, type TestApp } from './helpers/app';
import { AI_SECRET, startFakeAi, waitFor, type FakeAi } from './helpers/fake-ai';
import { makePdf, PDF } from './helpers/files';

const api = '/api/v1';
let t: TestApp;
let ai: FakeAi;
let runtime: PipelineRuntime;
let owner: Session & { email: string };
let jobId: string;

beforeAll(async () => {
  ai = await startFakeAi();
  t = await createTestApp('screenings', {
    overrides: {
      redisUrl: process.env.REDIS_URL,
      ai: { url: ai.url, hmacSecret: AI_SECRET, timeoutMs: 5000 },
      pipeline: {
        enabled: true, parseConcurrency: 1, extractConcurrency: 1, screenConcurrency: 1, attempts: 2, backoffMs: 30,
        pollIntervalMs: 40, lockDurationMs: 30_000, queuePrefix: `rms-test-scr-${process.pid}`,
      },
    },
  });
  runtime = t.app.get(PipelineRuntime);
  owner = await register(t, 'Screening Org');
  jobId = (await t.http().post(`${api}/jobs`).set(bearer(owner)).send({ title: 'Backend' })).body.id;
});
afterAll(async () => {
  await runtime.obliterate();
  await t.close();
  await ai.close();
});
beforeEach(() => {
  ai.calls.length = 0;
});

let seq = 0;
let lastCandidate = '';
const newCandidate = async (name = `Ứng viên ${++seq}`): Promise<string> =>
  (await t.http().post(`${api}/candidates`).set(bearer(owner)).send({ display_name: name })).body.id;

/** Mỗi lần upload dùng một ứng viên mới, vì một ứng viên chỉ có một application trong mỗi job. */
async function uploadResume(candidateId?: string): Promise<string> {
  const pdf = await makePdf(1, `scr-${++seq}-${Date.now()}`);
  return (await t.http().post(`${api}/resumes/upload`).set(bearer(owner))
    .field('candidate_id', candidateId ?? (lastCandidate = await newCandidate())).attach('file', pdf, { filename: 'cv.pdf', contentType: PDF }).expect(201)).body.id;
}
const parseStatus = async (id: string) =>
  (await t.db.admin.query('SELECT parse_status FROM resumes WHERE id = $1', [id])).rows[0].parse_status as string;
const waitDoc = (id: string, want = 'ready') => waitFor(async () => (await parseStatus(id)) === want, 10_000, `doc ${want}`);

async function approvedJd() {
  const v = (await t.http().post(`${api}/jobs/${jobId}/jd/versions`).set(bearer(owner)).send({}).expect(201)).body;
  await t.http().put(`${api}/jobs/${jobId}/jd/versions/${v.id}/criteria`).set(bearer(owner))
    .send({ criteria: [{ code: 'python', label: 'Python', weight: 30, priority: 'must_have' }, { code: 'sql', label: 'SQL', weight: 20 }] }).expect(200);
  await t.http().post(`${api}/jobs/${jobId}/jd/versions/${v.id}/approve`).set(bearer(owner)).expect(200);
  return v.id as string;
}
async function application(resumeId: string, candidateId = lastCandidate): Promise<string> {
  return (await t.http().post(`${api}/jobs/${jobId}/applications`).set(bearer(owner))
    .send({ candidate_id: candidateId, resume_id: resumeId }).expect(201)).body.id;
}
const start = (appId: string, key: string, who = owner) =>
  t.http().post(`${api}/jobs/${jobId}/screenings`).set(bearer(who)).set('Idempotency-Key', key).send({ application_id: appId });
const evalCalls = (resumeId: string) =>
  ai.calls.filter((c) => c.path.endsWith('/evaluate') && c.body.resume_id === resumeId).length;
const runStatus = async (id: string) =>
  (await t.db.admin.query('SELECT status FROM screening_runs WHERE id = $1', [id])).rows[0].status as string;
const waitRun = (id: string, want: string) => waitFor(async () => (await runStatus(id)) === want, 10_000, `run ${want}`);

describe('POST /jobs/:id/screenings', () => {
  it('chưa có JD duyệt → 409; thiếu Idempotency-Key → 400', async () => {
    const other = (await t.http().post(`${api}/jobs`).set(bearer(owner)).send({ title: 'No JD' })).body.id;
    const r = await uploadResume();
    await waitDoc(r);
    const a = (await t.http().post(`${api}/jobs/${other}/applications`).set(bearer(owner))
      .send({ candidate_id: lastCandidate, resume_id: r }).expect(201)).body.id;
    const res = await t.http().post(`${api}/jobs/${other}/screenings`).set(bearer(owner)).set('Idempotency-Key', 'k').send({ application_id: a });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('no_approved_jd');
    await t.http().post(`${api}/jobs/${other}/screenings`).set(bearer(owner)).send({ application_id: a }).expect(400);
  });

  it('CV đã ready: 202 → completed, lưu điểm, kết quả từng tiêu chí và gọi AI đúng một lần', async () => {
    await approvedJd();
    const r = await uploadResume();
    await waitDoc(r);
    const appId = await application(r);
    const res = await start(appId, 'k-ready').expect(202);
    expect(res.body).toMatchObject({ status: 'queued', application_id: appId, candidate_name: expect.stringContaining('Ứng viên') });
    await waitRun(res.body.id, 'completed');
    expect(evalCalls(r)).toBe(1);
    const call = ai.calls.find((c) => c.path.endsWith('/evaluate') && c.body.resume_id === r)!;
    expect((call.body.criteria as unknown[]).length).toBe(2);
    expect(call.body.scoring).toMatchObject({ min_coverage: 0.6 });

    // Văn bản CV để UI tô sáng trích dẫn.
    const key = `org/${owner.orgId}/extracted/${r}/parse-v1.txt`;
    await t.app.get(S3Service).put(key, Buffer.from('Python developer'), 'text/plain');
    const detail = (await t.http().get(`${api}/jobs/${jobId}/screenings/${res.body.id}`).set(bearer(owner)).expect(200)).body;
    expect(detail).toMatchObject({ status: 'completed', score_state: 'scored', observed_score: 100, coverage: 0.5, model: 'fake-model' });
    expect(detail.results.map((x: { code: string; level: string }) => [x.code, x.level])).toEqual([['python', 'strong'], ['sql', 'unknown']]);
    expect(detail.results[0].evidence[0]).toMatchObject({ quote: 'Python', start_offset: 0 });
    expect(detail.cv_text).toBe('Python developer');
    const list = (await t.http().get(`${api}/jobs/${jobId}/screenings`).set(bearer(owner)).expect(200)).body.items;
    expect(list.some((x: { id: string }) => x.id === res.body.id)).toBe(true);
  });

  it('replay cùng Idempotency-Key trả đúng run cũ; khác nội dung → 422; khác khoá nhưng cùng danh tính → cùng run', async () => {
    await approvedJd();
    const r = await uploadResume();
    await waitDoc(r);
    const appId = await application(r);
    const first = await start(appId, 'k-idem').expect(202);
    const again = await start(appId, 'k-idem').expect(202);
    expect(again.body.id).toBe(first.body.id);
    const other = await application(await uploadResume());
    expect((await start(other, 'k-idem').expect(422)).body.error.code).toBe('idempotency_key_reuse');
    const diffKey = await start(appId, 'k-idem-2').expect(202);
    expect(diffKey.body.id).toBe(first.body.id);
    const n = await t.db.admin.query('SELECT count(*)::int AS n FROM screening_runs WHERE application_id = $1', [appId]);
    expect(n.rows[0].n).toBe(1);
    const jobs = await t.db.admin.query("SELECT count(*)::int AS n FROM background_jobs WHERE type = 'screening.assess' AND payload_json->>'run_id' = $1", [first.body.id]);
    expect(jobs.rows[0].n).toBe(1);
    await waitRun(first.body.id, 'completed');
    expect(evalCalls(r)).toBe(1);
  });

  it('request đồng thời cùng khoá chỉ tạo một run', async () => {
    await approvedJd();
    const r = await uploadResume();
    await waitDoc(r);
    const appId = await application(r);
    const rs = await Promise.all([1, 2, 3].map(() => start(appId, 'k-race')));
    expect(new Set(rs.map((x) => x.body.id)).size).toBe(1);
    expect(rs.every((x) => x.status === 202)).toBe(true);
  });

  it('CV chưa ready → waiting_document, tự tiếp tục khi CV xong', async () => {
    await approvedJd();
    let release!: () => void;
    const gate = new Promise<void>((res) => (release = res));
    const orig = ai.onExtract;
    ai.onExtract = async (c) => {
      await gate;
      return orig(c);
    };
    try {
      const r = await uploadResume();
      const appId = await application(r);
      const res = await start(appId, 'k-wait').expect(202);
      await waitRun(res.body.id, 'waiting_document');
      expect(evalCalls(r)).toBe(0);
      release();
      await waitRun(res.body.id, 'completed');
      expect(await parseStatus(r)).toBe('ready');
      expect(evalCalls(r)).toBe(1);
    } finally {
      release();
      ai.onExtract = orig;
    }
  });

  it('CV bị từ chối → run failed_validation, không gọi evaluate', async () => {
    await approvedJd();
    const orig = ai.onParse;
    ai.onParse = () => ({ status: 422, body: { detail: 'unreadable' } });
    try {
      const r = await uploadResume();
      const appId = await application(r);
      const res = await start(appId, 'k-rejected').expect(202);
      await waitRun(res.body.id, 'failed_validation');
      const row = (await t.db.admin.query('SELECT error FROM screening_runs WHERE id = $1', [res.body.id])).rows[0];
      expect(row.error).toBe('document_rejected');
      expect(evalCalls(r)).toBe(0);
    } finally {
      ai.onParse = orig;
    }
  });

  it('AI trả failed_validation hoặc lỗi 5xx kéo dài → run lỗi tương ứng', async () => {
    await approvedJd();
    const r = await uploadResume();
    await waitDoc(r);
    const appId = await application(r);
    const orig = ai.onEvaluate;
    ai.onEvaluate = () => ({ status: 200, body: { status: 'failed_validation', error: 'schema', results: [], score: null,
      prompt_version: 'assess-batch-v1', model: 'fake-model', truncated: false, timings: {} } });
    const a = await start(appId, 'k-fv').expect(202);
    await waitRun(a.body.id, 'failed_validation');

    // JD mới → danh tính run khác, nên chạy lại được; lần này AI sập.
    await approvedJd();
    ai.onEvaluate = () => ({ status: 503, body: { detail: 'down' } });
    const b = await start(appId, 'k-down').expect(202);
    expect(b.body.id).not.toBe(a.body.id);
    await waitRun(b.body.id, 'failed_provider');
    ai.onEvaluate = orig;
  });

  it('chỉ người có screening:run mới tạo; viewer đọc được', async () => {
    await approvedJd();
    const r = await uploadResume();
    await waitDoc(r);
    const appId = await application(r);
    const viewer = await addMember(t, owner.orgId, 'viewer');
    await start(appId, 'k-viewer', viewer).expect(403);
    const run = await start(appId, 'k-owner').expect(202);
    await t.http().get(`${api}/jobs/${jobId}/screenings/${run.body.id}`).set(bearer(viewer)).expect(200);
  });

  it('tenant khác không thấy hay chạy được lượt sàng lọc của tổ chức này', async () => {
    await approvedJd();
    const r = await uploadResume();
    await waitDoc(r);
    const appId = await application(r);
    const run = await start(appId, 'k-tenant').expect(202);
    const other = await register(t, 'Other Org');
    await t.http().get(`${api}/jobs/${jobId}/screenings/${run.body.id}`).set(bearer(other)).expect(404);
    expect((await t.http().get(`${api}/jobs/${jobId}/screenings`).set(bearer(other)).expect(404)).status).toBe(404);
    await start(appId, 'k-tenant-x', other).expect(404);
  });
});
