import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import type { PlatformClient, Session } from "@rms-ai/contracts";
import { platformClient, Workspace } from "./app/context";
import { PlatformError, message } from "./lib/api/platform";
import { Login } from "./features/auth/Login";
import { Shell, ThemeButton } from "./app/Shell";
import { Dashboard } from "./app/Dashboard";
import { Jobs, JobDetail } from "./features/jobs/Jobs";
import { Candidates, CandidateDetail } from "./features/candidates/Candidates";
import { ApplicationDetail } from "./features/applications/ApplicationDetail";
import { Admin } from "./features/admin/Admin";
import { Empty, LoadState } from "./app/ui";
export default function App({
  client = platformClient,
}: {
  client?: PlatformClient;
}) {
  const [session, setSession] = useState<Session>(),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    const c = new AbortController();
    setLoading(true);
    setError("");
    client
      .me(c.signal)
      .then((v) => {
        if (!c.signal.aborted) setSession(v);
      })
      .catch((e) => {
        if (
          !c.signal.aborted &&
          !(e instanceof PlatformError && e.status === 401)
        )
          setError(message(e));
      })
      .finally(() => {
        if (!c.signal.aborted) setLoading(false);
      });
    const expired = () => setSession(undefined);
    window.addEventListener("platform:unauthorized", expired);
    return () => {
      c.abort();
      window.removeEventListener("platform:unauthorized", expired);
    };
  }, [client, retry]);
  if (loading || error)
    return (
      <div className="p-boot">
        <a className="p-logo" href="/">
          lá.
        </a>
        <LoadState
          loading={loading}
          error={error}
          reload={() => setRetry((v) => v + 1)}
        />
      </div>
    );
  return (
    <BrowserRouter>
      {session ? (
        <Workspace.Provider
          value={{
            client,
            session,
            refreshSession: async () => setSession(await client.me()),
          }}
        >
          <Routes>
            <Route element={<Shell onLogout={() => setSession(undefined)} />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/jobs" element={<Jobs />} />
              <Route path="/jobs/:id" element={<JobDetail />} />
              <Route
                path="/candidates"
                element={
                  session.user.role === "reviewer" ? (
                    <Empty title="Mở hồ sơ từ vị trí được phân công" />
                  ) : (
                    <Candidates />
                  )
                }
              />
              <Route
                path="/candidates/:id"
                element={
                  session.user.role === "reviewer" ? (
                    <Empty title="Mở hồ sơ từ vị trí được phân công" />
                  ) : (
                    <CandidateDetail />
                  )
                }
              />
              <Route path="/applications/:id" element={<ApplicationDetail />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route
                path="/login"
                element={<Navigate to="/dashboard" replace />}
              />
              <Route
                path="*"
                element={
                  <Empty title="Trang này chưa có tại lá.">
                    Chọn một mục trong điều hướng để tiếp tục.
                  </Empty>
                }
              />
            </Route>
          </Routes>
        </Workspace.Provider>
      ) : (
        <>
          <div className="p-login-theme">
            <ThemeButton />
          </div>
          {import.meta.env.VITE_USE_MOCK === "1" && (
            <div className="p-mock">
              BẢN XEM TRƯỚC · Dữ liệu mô phỏng, không lưu vào máy chủ.
            </div>
          )}
          <Routes>
            <Route
              path="*"
              element={<Login client={client} onLogin={setSession} />}
            />
          </Routes>
        </>
      )}
    </BrowserRouter>
  );
}
