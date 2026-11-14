import { createHash, createHmac } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import type { ExtractedProfile } from '@rms/contracts';
import { APP_CONFIG, type AppConfig } from '../config';

export const SERVICE_ID = 'api';

/** Phải trùng với `app.security.sign` bên Python (có test vector chung). */
export function signRequest(
  secret: string, serviceId: string, timestamp: number, method: string, path: string, body: string,
): string {
  const bodyHash = createHash('sha256').update(body).digest('hex');
  const message = `${serviceId}\n${timestamp}\n${method.toUpperCase()}\n${path}\n${bodyHash}`;
  return createHmac('sha256', secret).update(message).digest('hex');
}

export class AiHttpError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
  /** 4xx: lỗi của tài liệu hoặc yêu cầu, thử lại không giúp ích. */
  get permanent(): boolean {
    return this.status >= 400 && this.status < 500 && this.status !== 408 && this.status !== 429;
  }
}

export interface ParseResult {
  extracted_text_key: string;
  char_count: number;
  page_count: number | null;
  ocr_used: boolean;
  quality_flags: string[];
  parser_version: string;
}
export interface ExtractResult {
  profile: ExtractedProfile;
  prompt_version: string;
  model: string;
  truncated: boolean;
  timings: Record<string, number | null>;
}

export interface EvaluateCriterion {
  code: string;
  label: string;
  description: string;
  weight: number;
  priority: 'must_have' | 'nice_to_have';
}
export interface EvaluateResult {
  status: 'ok' | 'failed_validation';
  error: string | null;
  results: Array<{
    code: string; level: string; status: string; match_value: number | null; weight: number;
    rationale: string; evidence: Array<{ quote: string; start_offset: number; end_offset: number }>;
    validated: boolean; raw: Record<string, unknown>; notes: string[];
  }>;
  score: {
    score_state: 'scored' | 'insufficient_coverage'; observed_score: number | null; coverage: number;
    lower_bound: number; upper_bound: number; requires_manual_review: boolean;
  } | null;
  prompt_version: string;
  model: string;
  truncated: boolean;
  timings: Record<string, unknown>;
}

@Injectable()
export class AiClient {
  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  parse(p: { organization_id: string; resume_id: string; object_key: string; mime_type: string }) {
    return this.post<ParseResult>('/internal/v1/documents/parse', p);
  }

  extract(p: { organization_id: string; resume_id: string; extracted_text_key: string }) {
    return this.post<ExtractResult>('/internal/v1/documents/extract', p);
  }

  evaluate(p: {
    organization_id: string; resume_id: string; extracted_text_key: string;
    criteria: EvaluateCriterion[]; scoring: { rubric_values: Record<string, number>; min_coverage: number };
  }) {
    return this.post<EvaluateResult>('/internal/v1/screenings/evaluate', p);
  }

  private async post<T>(path: string, payload: unknown): Promise<T> {
    const body = JSON.stringify(payload);
    const ts = Math.floor(Date.now() / 1000);
    let res: Response;
    try {
      res = await fetch(`${this.config.ai.url}${path}`, {
        method: 'POST',
        body,
        headers: {
          'content-type': 'application/json',
          'x-service-id': SERVICE_ID,
          'x-timestamp': String(ts),
          'x-signature': signRequest(this.config.ai.hmacSecret, SERVICE_ID, ts, 'POST', path, body),
        },
        signal: AbortSignal.timeout(this.config.ai.timeoutMs),
      });
    } catch (e) {
      // Timeout hoặc mất kết nối: có thể thử lại.
      throw new AiHttpError(599, `AI service unreachable: ${(e as Error).message}`);
    }
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new AiHttpError(res.status, `AI ${path} → ${res.status}: ${text.slice(0, 300)}`);
    }
    return (await res.json()) as T;
  }
}
