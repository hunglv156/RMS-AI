import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { signRequest } from '../../src/pipeline/ai-client';

export const AI_SECRET = 'fake-ai-secret-fake-ai-secret-123456';

export interface FakeAiCall {
  path: string;
  body: Record<string, unknown>;
}
type Reply = { status: number; body: unknown } | Promise<{ status: number; body: unknown }>;

export interface FakeAi {
  url: string;
  calls: FakeAiCall[];
  count(path: string): number;
  onParse: (call: FakeAiCall) => Reply;
  onExtract: (call: FakeAiCall) => Reply;
  onEvaluate: (call: FakeAiCall) => Reply;
  close(): Promise<void>;
}

export const PROFILE = {
  headline: 'Backend Engineer', years_of_experience: 4, skills: ['Python', 'PostgreSQL'],
  experience: [{ company: 'Acme', title: 'Dev', period: '2020-2024' }], education: ['BSc'], languages: ['English'],
};

/** FastAPI giả: kiểm tra chữ ký HMAC độc lập rồi trả kết quả do test quy định. */
export async function startFakeAi(): Promise<FakeAi> {
  const fake: FakeAi = {
    url: '', calls: [],
    count: (p) => fake.calls.filter((c) => c.path === p).length,
    onParse: (c) => ({
      status: 200,
      body: {
        extracted_text_key: `org/${c.body.organization_id}/extracted/${c.body.resume_id}/parse-v1.txt`,
        char_count: 1200, page_count: 1, ocr_used: false, quality_flags: [], parser_version: 'parse-v1',
      },
    }),
    onExtract: () => ({
      status: 200,
      body: { profile: PROFILE, prompt_version: 'extract-slim-v1', model: 'fake-model', truncated: false, timings: { total_seconds: 0.1 } },
    }),
    onEvaluate: (c) => ({
      status: 200,
      body: {
        status: 'ok', error: null, prompt_version: 'assess-batch-v1', model: 'fake-model', truncated: false,
        timings: { calls: 1, llm_seconds: 0.1 },
        results: (c.body.criteria as Array<{ code: string; weight: number }>).map((k, i) => ({
          code: k.code, level: i === 0 ? 'strong' : 'unknown', status: i === 0 ? 'supported' : 'unknown',
          match_value: i === 0 ? 1 : null, weight: k.weight, rationale: 'r',
          evidence: i === 0 ? [{ quote: 'Python', start_offset: 0, end_offset: 6 }] : [], validated: true,
          raw: { level: i === 0 ? 'strong' : 'unknown' }, notes: [],
        })),
        score: { score_state: 'scored', observed_score: 100, coverage: 0.5, lower_bound: 50, upper_bound: 100, requires_manual_review: false },
      },
    }),
    close: () => new Promise((r) => server.close(() => r())),
  };
  const server = http.createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => {
      void (async () => {
        const raw = Buffer.concat(chunks).toString();
        const expected = signRequest(
          AI_SECRET, String(req.headers['x-service-id']), Number(req.headers['x-timestamp']),
          req.method ?? '', req.url ?? '', raw);
        if (req.headers['x-signature'] !== expected) {
          res.writeHead(401).end('{"detail":"Invalid signature"}');
          return;
        }
        const call = { path: req.url ?? '', body: JSON.parse(raw) as Record<string, unknown> };
        fake.calls.push(call);
        const reply = await (req.url?.endsWith('/parse') ? fake.onParse(call)
          : req.url?.endsWith('/evaluate') ? fake.onEvaluate(call) : fake.onExtract(call));
        res.writeHead(reply.status, { 'content-type': 'application/json' }).end(JSON.stringify(reply.body));
      })();
    });
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  fake.url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return fake;
}

export async function waitFor<T>(fn: () => Promise<T | false | undefined | null>, ms = 10_000, label = 'điều kiện'): Promise<T> {
  const end = Date.now() + ms;
  for (;;) {
    const v = await fn();
    if (v) return v;
    if (Date.now() > end) throw new Error(`Hết thời gian chờ ${label}`);
    await new Promise((r) => setTimeout(r, 25));
  }
}
