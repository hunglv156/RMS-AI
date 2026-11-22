import { useState } from "react";
import type { Role, PlatformClient, User, UserPage } from "@rms-ai/contracts";
import { useLoad, useWorkspace } from "../../app/context";
import {
  ActionForm,
  Badge,
  Empty,
  Field,
  Heading,
  LoadState,
  Pager,
  Search,
} from "../../app/ui";
// T8.2 currently paginates users but ignores optional search/role query filters.
// Apply those contract filters here across all pages until the server supports them.
export async function filteredUsers(
  client: PlatformClient,
  query: { page: number; search?: string; role?: Role },
  signal: AbortSignal,
): Promise<UserPage> {
  if (!query.search && !query.role)
    return client.users({ page: query.page }, signal);
  const all: User[] = [];
  let page = 1;
  while (true) {
    const rows = await client.users({ page, pageSize: 100 }, signal);
    all.push(...rows.items);
    if (page * 100 >= rows.total || rows.items.length === 0) break;
    page++;
  }
  const term = query.search?.trim().toLocaleLowerCase("vi-VN") ?? "";
  const matches = all.filter(
    (u) =>
      (!query.role || u.role === query.role) &&
      (!term ||
        `${u.display_name} ${u.normalized_email}`
          .toLocaleLowerCase("vi-VN")
          .includes(term)),
  );
  return {
    items: matches.slice((query.page - 1) * 20, query.page * 20),
    total: matches.length,
    page: query.page,
    pageSize: 20,
  };
}
export function Admin() {
  const { client, session, refreshSession } = useWorkspace();
  const [page, setPage] = useState(1),
    [search, setSearch] = useState(""),
    [create, setCreate] = useState(false);
  const load = useLoad(
    (s) =>
      session.user.role === "admin"
        ? filteredUsers(client, { page, search }, s)
        : Promise.reject(
            new Error("Chỉ quản trị viên có thể quản lý tài khoản."),
          ),
    [client, page, search, session.user.role],
  );
  if (session.user.role !== "admin")
    return <Empty title="Cần quyền quản trị viên" />;
  return (
    <>
      <Heading title="Quản trị tài khoản">
        Cấp đúng quyền. Cộng tác an toàn trong cùng một không gian.
      </Heading>
      <div className="p-toolbar">
        <Search
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
        />
        <button className="button primary" onClick={() => setCreate(!create)}>
          + Tạo tài khoản
        </button>
      </div>
      {create && (
        <section className="p-card">
          <h2>Thêm người đồng hành</h2>
          <ActionForm
            label="Tạo tài khoản"
            onSubmit={async (f) => {
              await client.createUser({
                display_name: String(f.get("display_name")),
                email: String(f.get("email")),
                password: String(f.get("password")),
                role: f.get("role") as Role,
              });
              setCreate(false);
              load.reload();
            }}
          >
            <Field label="Tên hiển thị" name="display_name" required />
            <Field label="Email đăng nhập" name="email" type="email" required />
            <Field
              label="Mật khẩu ban đầu (ít nhất 12 ký tự)"
              name="password"
              type="password"
              required
            />
            <RoleField />
          </ActionForm>
        </section>
      )}
      <LoadState {...load} />
      {load.data && (
        <section className="p-card">
          {load.data.items.length ? (
            load.data.items.map((u) => (
              <details
                className="p-user"
                key={`${u.id}-${u.role}-${u.disabled_at}`}
              >
                <summary>
                  <span>
                    <strong>{u.display_name}</strong>
                    <small>{u.normalized_email}</small>
                  </span>
                  <Badge value={u.role} />
                  <span className="p-badge">
                    {u.disabled_at ? "Đã vô hiệu hóa" : "Đang hoạt động"}
                  </span>
                </summary>
                <ActionForm
                  onSubmit={async (f) => {
                    await client.updateUser(u.id, {
                      display_name: String(f.get("display_name")),
                      role: f.get("role") as Role,
                      disabled: f.get("disabled") === "on",
                      ...(f.get("password")
                        ? { password: String(f.get("password")) }
                        : {}),
                    });
                    await refreshSession();
                    load.reload();
                  }}
                >
                  <Field
                    label="Tên hiển thị"
                    name="display_name"
                    value={u.display_name}
                    required
                  />
                  <RoleField value={u.role} />
                  <label className="p-check">
                    <input
                      type="checkbox"
                      name="disabled"
                      defaultChecked={!!u.disabled_at}
                    />
                    Vô hiệu hóa tài khoản
                  </label>
                  <Field
                    label="Đổi mật khẩu (để trống nếu giữ nguyên)"
                    name="password"
                    type="password"
                  />
                </ActionForm>
              </details>
            ))
          ) : (
            <Empty title="Chưa tìm thấy tài khoản" />
          )}
          <Pager page={page} total={load.data.total} onChange={setPage} />
        </section>
      )}
    </>
  );
}
function RoleField({ value = "reviewer" }: { value?: Role }) {
  return (
    <label>
      Vai trò
      <select name="role" defaultValue={value}>
        <option value="reviewer">
          Người đánh giá · Chỉ vị trí được phân công
        </option>
        <option value="recruiter">
          Chuyên viên tuyển dụng · Quản lý hồ sơ và JD
        </option>
        <option value="admin">Quản trị viên · Toàn quyền</option>
      </select>
    </label>
  );
}
export function Assignments({ jobId }: { jobId: string }) {
  const { client } = useWorkspace();
  const [page, setPage] = useState(1);
  const load = useLoad(
    (s) => filteredUsers(client, { role: "reviewer", page }, s),
    [client, page],
  );
  const [selected, setSelected] = useState<string[]>([]);
  return (
    <details className="p-card">
      <summary>Phân công người đánh giá</summary>
      <p className="muted">
        Đây là danh sách thay thế, không phải danh sách phân công hiện tại. Chọn
        đầy đủ người cần cấp quyền trước khi lưu; mọi phân công cũ không có
        trong danh sách mới sẽ được thu hồi.
      </p>
      <LoadState {...load} />
      <ActionForm
        label="Thay thế danh sách phân công"
        onSubmit={() => client.assignReviewers(jobId, { user_ids: selected })}
      >
        {load.data?.items
          .filter((u) => !u.disabled_at)
          .map((u) => (
            <label className="p-check" key={u.id}>
              <input
                type="checkbox"
                checked={selected.includes(u.id)}
                onChange={(e) =>
                  setSelected((v) =>
                    e.target.checked
                      ? [...v, u.id]
                      : v.filter((id) => id !== u.id),
                  )
                }
              />
              {u.display_name}
              <small>{u.normalized_email}</small>
            </label>
          ))}
        <p>
          {selected.length} người được chọn.{" "}
          {selected.length === 0
            ? "Lưu danh sách rỗng sẽ thu hồi mọi phân công."
            : ""}
        </p>
      </ActionForm>
      {load.data && (
        <Pager page={page} total={load.data.total} onChange={setPage} />
      )}
    </details>
  );
}
