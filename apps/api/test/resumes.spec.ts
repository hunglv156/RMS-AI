import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { addMember, bearer, createTestApp, register, type Session, type TestApp } from './helpers/app';
import { DOCX, makeDocx, makePdf, PDF } from './helpers/files';

const api = '/api/v1';
let t: TestApp;
let owner: Session & { email: string };
let candidate: string;

beforeAll(async () => {
  t = await createTestApp('resumes');
  owner = await register(t, 'A');
  candidate = (await t.http().post(`${api}/candidates`).set(bearer(owner)).send({ display_name: 'C' })).body.id;
});
afterAll(async () => {
  await t.close();
});

const upload = (who: { access: string }, file: Buffer, name: string, mime: string, cand = candidate) =>
  t.http().post(`${api}/resumes/upload`).set(bearer(who))
    .field('candidate_id', cand).attach('file', file, { filename: name, contentType: mime });

describe('upload và kiểm tra file', () => {
  it('PDF hợp lệ → 201; cùng nội dung trong cùng org → 200 dùng lại bản ghi cũ', async () => {
    const pdf = await makePdf(2, 'dedupe');
    const first = await upload(owner, pdf, 'cv.pdf', PDF).expect(201);
    expect(first.body).toMatchObject({ parse_status: 'uploaded', page_count: 2, mime_type: PDF });
    const again = await upload(owner, pdf, 'copy.pdf', PDF).expect(200);
    expect(again.body.id).toBe(first.body.id);
    expect(again.body.deduplicated).toBe(true);
    const n = await t.db.admin.query('SELECT count(*)::int AS n FROM resumes WHERE sha256 = $1', [first.body.sha256]);
    expect(n.rows[0].n).toBe(1);
  });

  it('object key theo dạng org/<orgId>/resumes/<uuid>', async () => {
    const r = (await upload(owner, await makePdf(1, 'key'), 'k.pdf', PDF).expect(201)).body;
    const row = await t.db.admin.query('SELECT object_key FROM resumes WHERE id = $1', [r.id]);
    expect(row.rows[0].object_key).toBe(`org/${owner.orgId}/resumes/${r.id}`);
  });

  it('từ chối file giả mạo extension hoặc MIME', async () => {
    const pdf = await makePdf(1, 'fake');
    const r1 = await upload(owner, pdf, 'cv.docx', DOCX).expect(422);
    expect(r1.body.error.code).toBe('file_rejected');
    await upload(owner, pdf, 'cv.pdf', 'text/plain').expect(422);
    await upload(owner, Buffer.from('MZ\x90\x00 not a pdf'), 'cv.pdf', PDF).expect(422);
    await upload(owner, Buffer.from('<script>alert(1)</script>'), 'cv.pdf', PDF).expect(422);
    await upload(owner, makeDocx(), 'cv.pdf', PDF).expect(422);
  });

  it('từ chối PDF quá 20 trang và file rỗng', async () => {
    await upload(owner, await makePdf(21, 'long'), 'long.pdf', PDF).expect(422);
    await upload(owner, await makePdf(20, 'ok20'), 'ok.pdf', PDF).expect(201);
    await upload(owner, Buffer.alloc(0), 'e.pdf', PDF).expect(422);
  });

  it('từ chối file quá 10MB', async () => {
    const big = Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(10 * 1024 * 1024 + 10, 0x20)]);
    await upload(owner, big, 'big.pdf', PDF).expect(413);
  });

  it('DOCX hợp lệ được nhận; DOCX độc hại bị từ chối', async () => {
    await upload(owner, makeDocx({}, 'ok-1'), 'cv.docx', DOCX).expect(201);
    // Zip bomb: ~60MB dữ liệu lặp nén còn rất nhỏ.
    const bomb = makeDocx({ 'word/media/bomb.bin': new Uint8Array(60 * 1024 * 1024) });
    expect(bomb.length).toBeLessThan(10 * 1024 * 1024);
    const r = await upload(owner, bomb, 'bomb.docx', DOCX).expect(422);
    expect(r.body.error.message).toMatch(/zip bomb|nén/i);
    await upload(owner, makeDocx({ 'word/vbaProject.bin': new Uint8Array([1, 2, 3]) }, 'macro'), 'm.docx', DOCX).expect(422);
    await upload(owner, makeDocx({ 'word/embeddings/x.bin': new Uint8Array([1]) }, 'emb'), 'e.docx', DOCX).expect(422);
    await upload(owner, makeDocx({ '../evil.txt': new Uint8Array([1]) }, 'trav'), 't.docx', DOCX).expect(422);
  });

  it('thiếu file / candidate không tồn tại / candidate của org khác', async () => {
    await t.http().post(`${api}/resumes/upload`).set(bearer(owner)).field('candidate_id', candidate).expect(400);
    const other = await register(t, 'B');
    const pdf = await makePdf(1, 'cross');
    await upload(owner, pdf, 'x.pdf', PDF, '00000000-0000-4000-8000-000000000000').expect(404);
    const candB = (await t.http().post(`${api}/candidates`).set(bearer(other)).send({ display_name: 'CB' })).body.id;
    await upload(owner, pdf, 'x.pdf', PDF, candB).expect(404);
  });

  it('viewer và hiring_manager không upload được', async () => {
    for (const role of ['viewer', 'hiring_manager']) {
      const m = await addMember(t, owner.orgId, role);
      await upload(m, await makePdf(1, role), 'x.pdf', PDF).expect(403);
    }
  });

  it('cùng file ở org khác tạo bản ghi riêng', async () => {
    const other = await register(t, 'B2');
    const cb = (await t.http().post(`${api}/candidates`).set(bearer(other)).send({ display_name: 'CB' })).body.id;
    const pdf = await makePdf(1, 'shared');
    const a = await upload(owner, pdf, 'x.pdf', PDF).expect(201);
    const b = await upload(other, pdf, 'x.pdf', PDF, cb).expect(201);
    expect(b.body.id).not.toBe(a.body.id);
  });
});

describe('download có authorize', () => {
  it('trả presigned URL sống 5 phút, tải về đúng nội dung', async () => {
    const pdf = await makePdf(1, 'dl');
    const r = (await upload(owner, pdf, 'dl.pdf', PDF).expect(201)).body;
    const rec = await addMember(t, owner.orgId, 'recruiter');
    const res = await t.http().get(`${api}/resumes/${r.id}/download-url`).set(bearer(rec)).expect(200);
    expect(res.body.expires_in).toBe(300);
    expect(new URL(res.body.url).searchParams.get('X-Amz-Expires')).toBe('300');
    const file = await fetch(res.body.url);
    expect(file.status).toBe(200);
    expect(Buffer.from(await file.arrayBuffer()).equals(pdf)).toBe(true);
  });

  it('object trên RustFS không đọc được nếu không có chữ ký', async () => {
    const r = (await upload(owner, await makePdf(1, 'nosig'), 'n.pdf', PDF).expect(201)).body;
    const url = (await t.http().get(`${api}/resumes/${r.id}/download-url`).set(bearer(owner))).body.url as string;
    const bare = url.split('?')[0]!;
    expect((await fetch(bare)).status).toBe(403);
    const tampered = url.replace(/X-Amz-Signature=[0-9a-f]+/, 'X-Amz-Signature=' + '0'.repeat(64));
    expect((await fetch(tampered)).status).toBe(403);
  });

  it('org khác không lấy được URL hay trạng thái; viewer không có resume:download', async () => {
    const r = (await upload(owner, await makePdf(1, 'authz'), 'a.pdf', PDF).expect(201)).body;
    const other = await register(t, 'B3');
    await t.http().get(`${api}/resumes/${r.id}/download-url`).set(bearer(other)).expect(404);
    await t.http().get(`${api}/resumes/${r.id}/status`).set(bearer(other)).expect(404);
    const viewer = await addMember(t, owner.orgId, 'viewer');
    await t.http().get(`${api}/resumes/${r.id}/download-url`).set(bearer(viewer)).expect(403);
    const st = await t.http().get(`${api}/resumes/${r.id}/status`).set(bearer(viewer)).expect(200);
    expect(st.body.parse_status).toBe('uploaded');
    await t.http().get(`${api}/resumes/${r.id}/download-url`).expect(401);
  });

  it('xoá ứng viên xoá luôn file gốc trên S3', async () => {
    const c = (await t.http().post(`${api}/candidates`).set(bearer(owner)).send({ display_name: 'Del' })).body.id;
    const r = (await upload(owner, await makePdf(1, 'del'), 'd.pdf', PDF, c).expect(201)).body;
    const url = (await t.http().get(`${api}/resumes/${r.id}/download-url`).set(bearer(owner))).body.url as string;
    expect((await fetch(url)).status).toBe(200);
    await t.http().delete(`${api}/candidates/${c}`).set(bearer(owner)).expect(204);
    expect((await fetch(url)).status).toBe(404);
  });
});
