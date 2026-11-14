import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { signRequest } from '../src/pipeline/ai-client';
import { PIPELINE_VERSION } from '../src/pipeline/constants';
import { PipelineRuntime } from '../src/pipeline/pipeline-runtime';
import { bearer, createTestApp, register, type Session, type TestApp } from './helpers/app';
import { AI_SECRET, startFakeAi, waitFor, type FakeAi } from './helpers/fake-ai';
import { makePdf, PDF } from './helpers/files';

const api = '/api/v1';
let t: TestApp;
let ai: FakeAi;
let runtime: PipelineRuntime;
let owner: Session & { email: string };
let candidate: string;

beforeAll(async () => {
  ai = await startFakeAi();
  t = await createTestApp('pipeline', {
    overrides: {
      redisUrl: process.env.REDIS_URL,
      ai: { url: ai.url, hmacSecret: AI_SECRET, timeoutMs: 5000 },
      pipeline: {
        enabled: true, parseConcurrency: 1, extractConcurrency: 1, attempts: 3, backoffMs: 30,
        pollIntervalMs: 40, lockDurationMs: 30_000, queuePrefix: `rms-test-${process.pid}`,
      },
    },
  });
  runtime = t.app.get(PipelineRuntime);
  owner = await register(t, 'Pipeline Org');
  candidate = (await t.http().post(`${api}/candidates`).set(bearer(owner)).send({ display_name: 'C' })).body.id;
});

afterAll(async () => {
  await runtime.obliterate();
  await t.close();
  await ai.close();
});

beforeEach(() => {
  ai.calls.length = 0;
  ai.onParse = (c) => ({
    status: 200,
    body: {
      extracted_text_key: `org/${c.body.organization_id}/extracted/${c.body.resume_id}/parse-v1.txt`,
      char_count: 1200, page_count: 1, ocr_used: false, quality_flags: [], parser_version: 'parse-v1',
    },
  });
  ai.onExtract = () => ({
    status: 200,
    body: { profile: { headline: 'Backend Engineer', years_of_experience: 4, skills: ['Python'], experience: [], education: [], languages: [] },
      prompt_version: 'extract-slim-v1', model: 'fake-model', truncated: false, timings: { total_seconds: 0.1 } },
  });
});

let seq = 0;
async function upload(): Promise<string> {
  const pdf = await makePdf(1, `pipe-${++seq}-${Date.now()}`);
  const res = await t.http().post(`${api}/resumes/upload`).set(bearer(owner))
    .field('candidate_id', candidate).attach('file', pdf, { filename: 'cv.pdf', contentType: PDF }).expect(201);
  return res.body.id;
}
const status = async (id: string) =>
  (await t.db.admin.query('SELECT parse_status FROM resumes WHERE id = $1', [id])).rows[0].parse_status as string;
const waitStatus = (id: string, want: string, ms = 10_000) =>
  waitFor(async () => (await status(id)) === want, ms, `status ${want}`);

describe('chữ ký HMAC', () => {
  it('vector chung với ai-service (Python)', () => {
    expect(signRequest('vector-secret-vector-secret-vector!', 'api', 1700000000, 'POST',
      '/internal/v1/documents/parse', '{"a":1}'))
      .toBe('3fdf2773022f8592ecd0feef484e20b4e68d22931bc902c7c81c6ca6ff473c39');
  });
});

describe('state machine document', () => {
  it('đi đúng thứ tự uploaded → queued → validating → extracting → ready và lưu hồ sơ', async () => {
    // Trạng thái của từng resume ngay lúc AI được gọi (hai CV chạy đan xen nên ghi theo resume).
    const seen: Record<string, string[]> = {};
    let parseStarted = 0;
    const gate = (() => { let open!: () => void; const p = new Promise<void>((r) => (open = r)); return { p, open }; })();
    const defaultParse = ai.onParse;
    ai.onParse = async (c) => {
      const id = String(c.body.resume_id);
      (seen[id] ??= []).push(await status(id));
      parseStarted++;
      await gate.p;
      return defaultParse(c);
    };
    const defaultExtract = ai.onExtract;
    ai.onExtract = async (c) => {
      const id = String(c.body.resume_id);
      (seen[id] ??= []).push(await status(id));
      return defaultExtract(c);
    };

    // Giữ worker parse bận bằng CV thứ nhất, để CV thứ hai nằm ở trạng thái queued.
    const first = await upload();
    await waitFor(async () => parseStarted === 1, 10_000, 'parse đầu tiên bắt đầu');
    const second = await upload();
    expect(await status(second)).toBe('uploaded');
    await waitStatus(second, 'queued');
    gate.open();

    await waitStatus(first, 'ready');
    await waitStatus(second, 'ready');
    for (const id of [first, second]) expect(seen[id]).toEqual(['validating', 'extracting']);

    const run = (await t.db.admin.query(
      'SELECT status, structured_profile_json, prompt_version, model, extracted_text_key FROM document_processing_runs WHERE resume_id = $1', [first])).rows[0];
    expect(run).toMatchObject({ status: 'succeeded', prompt_version: 'extract-slim-v1', model: 'fake-model' });
    expect(run.structured_profile_json.skills).toEqual(['Python']);

    const prof = await t.http().get(`${api}/resumes/${first}/profile`).set(bearer(owner)).expect(200);
    expect(prof.body).toMatchObject({ parse_status: 'ready', model: 'fake-model', profile: { headline: 'Backend Engineer' } });
    const outbox = await t.db.admin.query("SELECT status FROM background_jobs WHERE payload_json->>'resume_id' = $1", [first]);
    await waitFor(async () => (await t.db.admin.query("SELECT count(*)::int n FROM background_jobs WHERE payload_json->>'resume_id' = $1 AND status <> 'done'", [first])).rows[0].n === 0, 5000, 'outbox done');
    expect(outbox.rowCount).toBe(2); // parse + extract
  });

  it('AI lỗi tạm thời thì retry có backoff rồi thành công', async () => {
    let attempts = 0;
    const ok = ai.onExtract;
    ai.onExtract = (c) => (++attempts < 3 ? { status: 500, body: { detail: 'llm busy' } } : ok(c));
    const id = await upload();
    await waitStatus(id, 'ready');
    expect(ai.count('/internal/v1/documents/extract')).toBe(3);
    expect(ai.count('/internal/v1/documents/parse')).toBe(1);
  });

  it('hết 3 lượt retry thì failed_provider và vào dead-letter queue', async () => {
    ai.onExtract = () => ({ status: 502, body: { detail: 'LLM output truncated' } });
    const before = (await runtime.deadLetters()).length;
    const id = await upload();
    await waitStatus(id, 'failed_provider');
    expect(ai.count('/internal/v1/documents/extract')).toBe(3);
    const run = (await t.db.admin.query('SELECT status, error FROM document_processing_runs WHERE resume_id = $1', [id])).rows[0];
    expect(run.status).toBe('failed');
    expect(run.error).toMatch(/extract/);
    await waitFor(async () => (await runtime.deadLetters()).length === before + 1, 5000, 'dead-letter');
    const dead = (await runtime.deadLetters()).map((d) => d.data)
      .find((d) => (d.data as { resume_id: string }).resume_id === id)!;
    expect(dead).toMatchObject({ job: 'document.extract', attempts: 3 });
    const ob = await t.db.admin.query("SELECT status, last_error FROM background_jobs WHERE type='document.extract' AND payload_json->>'resume_id' = $1", [id]);
    expect(ob.rows[0].status).toBe('failed');
  });

  it('tài liệu hỏng (AI trả 422) bị rejected ngay, không retry', async () => {
    ai.onParse = () => ({ status: 422, body: { detail: 'Cannot read document' } });
    const id = await upload();
    await waitStatus(id, 'rejected');
    expect(ai.count('/internal/v1/documents/parse')).toBe(1);
    expect(ai.count('/internal/v1/documents/extract')).toBe(0);
  });

  it('cờ chất lượng too_short bật requires_manual_review', async () => {
    const base = ai.onParse;
    ai.onParse = async (c) => {
      const r = await base(c);
      return { status: r.status, body: { ...(r.body as object), quality_flags: ['ocr', 'too_short'], ocr_used: true } };
    };
    const id = await upload();
    await waitStatus(id, 'ready');
    const r = (await t.db.admin.query('SELECT requires_manual_review FROM resumes WHERE id = $1', [id])).rows[0];
    expect(r.requires_manual_review).toBe(true);
    const prof = await t.http().get(`${api}/resumes/${id}/profile`).set(bearer(owner)).expect(200);
    expect(prof.body.quality_flags).toEqual(['ocr', 'too_short']);
  });
});

describe('idempotency', () => {
  it('đẩy lại cùng dòng outbox không chạy hai lần', async () => {
    const id = await upload();
    await waitStatus(id, 'ready');
    const calls = ai.calls.length;
    // Giả lập poller đẩy lại cùng dòng outbox (vd crash trước khi đánh dấu enqueued).
    await t.db.admin.query("UPDATE background_jobs SET status='pending' WHERE payload_json->>'resume_id' = $1", [id]);
    await runtime.dispatchPending();
    await new Promise((r) => setTimeout(r, 400));
    expect(ai.calls.length).toBe(calls);
    expect(await status(id)).toBe('ready');
  });

  it('cùng idempotency_key chỉ có một dòng outbox', async () => {
    const id = await upload();
    await waitStatus(id, 'ready');
    const n = await t.db.admin.query("SELECT count(*)::int n FROM background_jobs WHERE idempotency_key = $1", [`document.parse:${id}:${PIPELINE_VERSION}`]);
    expect(n.rows[0].n).toBe(1);
  });

  it('upload trùng sha256 không tạo job mới', async () => {
    const pdf = await makePdf(1, `dup-${Date.now()}`);
    const send = () => t.http().post(`${api}/resumes/upload`).set(bearer(owner))
      .field('candidate_id', candidate).attach('file', pdf, { filename: 'cv.pdf', contentType: PDF });
    const first = (await send().expect(201)).body.id;
    await waitStatus(first, 'ready');
    const parses = ai.count('/internal/v1/documents/parse');
    await send().expect(200);
    await new Promise((r) => setTimeout(r, 300));
    expect(ai.count('/internal/v1/documents/parse')).toBe(parses);
  });
});

describe('cách ly tenant trong worker', () => {
  it('job mang organization_id của org khác với resume không thuộc org đó bị từ chối', async () => {
    const other = await register(t, 'Other Org');
    const id = await upload();
    await waitStatus(id, 'ready');
    const calls = ai.calls.length;
    const before = (await runtime.deadLetters()).length;
    await runtime.addRaw('document.parse', {
      outboxId: randomUUID(), organization_id: other.orgId, resume_id: id, actor_id: null,
    });
    await waitFor(async () => (await runtime.deadLetters()).length === before + 1, 8000, 'job giả mạo vào dead-letter');
    expect(ai.calls.length).toBe(calls);
    expect(await status(id)).toBe('ready'); // dữ liệu org gốc không bị đụng tới
    const dead = (await runtime.deadLetters()).map((d) => d.data)
      .find((d) => (d.data as { organization_id: string }).organization_id === other.orgId)!;
    expect(String(dead.error)).toMatch(/không thuộc tổ chức/);
  });
});
