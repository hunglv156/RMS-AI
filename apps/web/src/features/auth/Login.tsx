import { Leaf, ShieldCheck, ArrowUpRight } from "lucide-react";
import { ActionForm, Field } from "../../app/ui";
import type { Session, PlatformClient } from "@rms-ai/contracts";
export function Login({
  client,
  onLogin,
}: {
  client: PlatformClient;
  onLogin: (s: Session) => void;
}) {
  return (
    <main id="main" className="p-login">
      <section className="p-login-story">
        <a className="p-logo" href="/">
          lá<span>.</span>
          <Leaf size={22} />
        </a>
        <div>
          <p className="p-eyebrow">GIEO CƠ HỘI. KẾT NỐI NHÂN TÀI.</p>
          <h1>
            Một khởi đầu tốt, <br />
            cho những người <br />
            <em>phù hợp.</em>
          </h1>
          <p>
            Mỗi hồ sơ là một câu chuyện.
            <br />
            Cùng lá. tìm hiểu, đánh giá và đưa ra quyết định có căn cứ.
          </p>
        </div>
        <span className="p-story-note">
          <ShieldCheck size={18} /> Hồ sơ riêng tư · Quyết định bởi con người
        </span>
      </section>
      <section className="p-login-form">
        <div className="p-login-inner">
          <span className="p-badge">CHÀO MỪNG TRỞ LẠI</span>
          <h2>Đăng nhập vào lá.</h2>
          <p className="muted">Tiếp tục hành trình tuyển dụng của bạn.</p>
          <ActionForm
            label="Đăng nhập →"
            onSubmit={async (f) =>
              onLogin(
                await client.login({
                  email: String(f.get("email")),
                  password: String(f.get("password")),
                }),
              )
            }
          >
            <Field name="email" label="Email công việc" type="email" required />
            <label>
              Mật khẩu
              <input
                type="password"
                name="password"
                required
                autoComplete="current-password"
              />
            </label>
          </ActionForm>
          <p className="p-login-help">
            Chưa có tài khoản? Liên hệ quản trị viên để được cấp quyền.{" "}
            <ArrowUpRight size={15} />
          </p>
        </div>
        <small>lá. · Không gian tuyển dụng có căn cứ</small>
      </section>
    </main>
  );
}
