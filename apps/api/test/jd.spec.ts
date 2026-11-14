import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { addMember, bearer, createTestApp, register, type Session, type TestApp } from './helpers/app';
import { makePdf, PDF } from './helpers/files';

const api = '/api/v1';
let t: TestApp;
let owner: Session & { email: string };
let jobId: string;

beforeAll(async () => {
  t = await createTestApp('jd');
  owner = await register(t, 'JD Org');
  jobId = (await t.http().post(`${api}/jobs`).set(bearer(owner)).send({ title: 'Backend' })).body.id;
});
afterAll(async () => {
  await t.close();
});

const crit = (code: string, weight: number, extra = {}) => ({ code, label: code, weight, ...extra });
const newVersion = async (who = owner) =>
  (await t.http().post(`${api}/jobs/${jobId}/jd/versions`).set(bearer(who)).send({}).expect(201)).body;
const put = (vid: string, body: unknown, who = owner) =>
  t.http().put(`${api}/jobs/${jobId}/jd/versions/${vid}/criteria`).set(bearer(who)).send(body as object);

describe('JD version và tiêu chí', () => {
  it('tạo bản nháp, đánh số version, sửa tiêu chí, duyệt và đóng băng', async () => {
    const rec = await addMember(t, owner.orgId, 'recruiter');
    const hm = await addMember(t, owner.orgId, 'hiring_manager');
    const v1 = await newVersion(rec);
    expect(v1).toMatchObject({ version_no: 1, approval_status: 'draft', criteria: [] });
    const saved = await put(v1.id, {
      criteria: [crit('backend', 30, { priority: 'must_have', evidence_guidance: ['REST API'] }), crit('sql', 20)],
    }, rec).expect(200);
    expect(saved.body.criteria.map((c: { code: string }) => c.code)).toEqual(['backend', 'sql']);
    expect(saved.body.criteria[0]).toMatchObject({ priority: 'must_have', weight: 30 });

    // Chỉ người có jd:approve mới duyệt được.
    await t.http().post(`${api}/jobs/${jobId}/jd/versions/${v1.id}/approve`).set(bearer(rec)).expect(403);
    const approved = await t.http().post(`${api}/jobs/${jobId}/jd/versions/${v1.id}/approve`).set(bearer(hm)).expect(200);
    expect(approved.body.approval_status).toBe('approved');
    const job = await t.db.admin.query('SELECT active_jd_version_id FROM jobs WHERE id = $1', [jobId]);
    expect(job.rows[0].active_jd_version_id).toBe(v1.id);

    // Sau khi duyệt không sửa được nữa.
    const edit = await put(v1.id, { criteria: [crit('backend', 50)] }).expect(409);
    expect(edit.body.error.code).toBe('jd_approved');
    await t.http().post(`${api}/jobs/${jobId}/jd/versions/${v1.id}/approve`).set(bearer(hm)).expect(409);

    const v2 = await newVersion();
    expect(v2.version_no).toBe(2);
    const list = (await t.http().get(`${api}/jobs/${jobId}/jd/versions`).set(bearer(owner)).expect(200)).body.items;
    expect(list.map((v: { version_no: number }) => v.version_no)).toEqual([2, 1]);
  });

  it('DB cũng chặn sửa/xoá JD đã duyệt và tiêu chí của nó (không chỉ tầng API)', async () => {
    const v = await newVersion();
    await put(v.id, { criteria: [crit('aa', 1)] }).expect(200);
    await t.http().post(`${api}/jobs/${jobId}/jd/versions/${v.id}/approve`).set(bearer(owner)).expect(200);
    await expect(t.db.admin.query("UPDATE jd_versions SET content_json = '{}' WHERE id = $1", [v.id])).rejects.toThrow(/immutable/);
    await expect(t.db.admin.query('DELETE FROM jd_versions WHERE id = $1', [v.id])).rejects.toThrow(/immutable/);
    await expect(t.db.admin.query('UPDATE job_criteria SET weight = 99 WHERE jd_version_id = $1', [v.id])).rejects.toThrow(/immutable/);
    await expect(t.db.admin.query('DELETE FROM job_criteria WHERE jd_version_id = $1', [v.id])).rejects.toThrow(/immutable/);
    await expect(t.db.admin.query(
      "INSERT INTO job_criteria (organization_id, jd_version_id, code, label, weight) VALUES ($1,$2,'zz','zz',1)", [owner.orgId, v.id],
    )).rejects.toThrow(/immutable/);
  });

  it('trọng số âm, tổng bằng 0, mã trùng hoặc không hữu hạn → 400', async () => {
    const v = await newVersion();
    expect((await put(v.id, { criteria: [crit('aa', -1)] }).expect(400)).body.error.code).toBe('validation_error');
    const zero = await put(v.id, { criteria: [crit('aa', 0), crit('bb', 0)] }).expect(400);
    expect(JSON.stringify(zero.body)).toMatch(/Tổng trọng số/);
    const dup = await put(v.id, { criteria: [crit('aa', 1), crit('aa', 2)] }).expect(400);
    expect(JSON.stringify(dup.body)).toMatch(/Trùng mã/);
    await put(v.id, { criteria: [] }).expect(400);
    await put(v.id, { criteria: [crit('Bad Code', 1)] }).expect(400);
    // 1e999 được JSON.parse đọc thành Infinity.
    await t.http().put(`${api}/jobs/${jobId}/jd/versions/${v.id}/criteria`).set(bearer(owner))
      .set('content-type', 'application/json')
      .send('{"criteria":[{"code":"aa","label":"a","weight":1e999}]}').expect(400);
    // Tiêu chí trọng số 0 đơn lẻ vẫn hợp lệ khi tổng dương.
    await put(v.id, { criteria: [crit('aa', 0), crit('bb', 5)] }).expect(200);
  });

  it('không duyệt được JD chưa có tiêu chí', async () => {
    const v = await newVersion();
    const r = await t.http().post(`${api}/jobs/${jobId}/jd/versions/${v.id}/approve`).set(bearer(owner)).expect(409);
    expect(r.body.error.code).toBe('criteria_invalid');
  });

  it('viewer chỉ đọc', async () => {
    const viewer = await addMember(t, owner.orgId, 'viewer');
    await t.http().post(`${api}/jobs/${jobId}/jd/versions`).set(bearer(viewer)).send({}).expect(403);
    await t.http().get(`${api}/jobs/${jobId}/jd/versions`).set(bearer(viewer)).expect(200);
  });

  it('mỗi org có sẵn screening_config mặc định với rubric_values', async () => {
    const r = await t.db.admin.query('SELECT rubric_values, min_coverage FROM screening_configs WHERE organization_id = $1', [owner.orgId]);
    expect(r.rowCount).toBe(1);
    expect(r.rows[0].rubric_values).toEqual({ strong: 1, adequate: 0.7, partial: 0.4, absent: 0 });
    expect(Number(r.rows[0].min_coverage)).toBe(0.6);
  });
});

describe('applications', () => {
  async function candidateWithResume(who = owner) {
    const c = (await t.http().post(`${api}/candidates`).set(bearer(who)).send({ display_name: 'App Cand' })).body.id;
    const r = await t.http().post(`${api}/resumes/upload`).set(bearer(who)).field('candidate_id', c)
      .attach('file', await makePdf(1, `app-${Math.random()}`), { filename: 'cv.pdf', contentType: PDF }).expect(201);
    return { candidate: c as string, resume: r.body.id as string };
  }

  it('gắn CV vào job, liệt kê, chặn trùng và CV của ứng viên khác', async () => {
    const a = await candidateWithResume();
    const b = await candidateWithResume();
    const created = await t.http().post(`${api}/jobs/${jobId}/applications`).set(bearer(owner))
      .send({ candidate_id: a.candidate, resume_id: a.resume }).expect(201);
    expect(created.body).toMatchObject({ candidate_name: 'App Cand', resume_status: 'uploaded' });
    await t.http().post(`${api}/jobs/${jobId}/applications`).set(bearer(owner))
      .send({ candidate_id: a.candidate, resume_id: a.resume }).expect(409);
    const mismatch = await t.http().post(`${api}/jobs/${jobId}/applications`).set(bearer(owner))
      .send({ candidate_id: a.candidate, resume_id: b.resume }).expect(409);
    expect(mismatch.body.error.code).toBe('resume_candidate_mismatch');
    const list = (await t.http().get(`${api}/jobs/${jobId}/applications`).set(bearer(owner)).expect(200)).body.items;
    expect(list.some((x: { id: string }) => x.id === created.body.id)).toBe(true);

    const viewer = await addMember(t, owner.orgId, 'viewer');
    await t.http().post(`${api}/jobs/${jobId}/applications`).set(bearer(viewer))
      .send({ candidate_id: b.candidate, resume_id: b.resume }).expect(403);
  });

  it('DB chặn application ghép CV với ứng viên khác hoặc chéo tenant', async () => {
    const a = await candidateWithResume();
    const b = await candidateWithResume();
    await expect(t.db.admin.query(
      'INSERT INTO applications (organization_id, job_id, candidate_id, resume_id, created_by) VALUES ($1,$2,$3,$4,(SELECT id FROM users LIMIT 1))',
      [owner.orgId, jobId, a.candidate, b.resume])).rejects.toThrow(/fk_application_resume/);
    const other = await register(t, 'Other');
    await expect(t.db.admin.query(
      'INSERT INTO applications (organization_id, job_id, candidate_id, resume_id, created_by) VALUES ($1,$2,$3,$4,(SELECT id FROM users LIMIT 1))',
      [other.orgId, jobId, a.candidate, a.resume])).rejects.toThrow(/fk_application/);
  });
});
