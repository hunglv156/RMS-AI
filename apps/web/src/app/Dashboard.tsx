import { Link } from "react-router-dom";
import { ArrowUpRight, BriefcaseBusiness, Users, Sprout } from "lucide-react";
import { useWorkspace } from "./context";
import { Heading, Empty } from "./ui";
export function Dashboard() {
  const { session } = useWorkspace();
  return (
    <>
      <Heading
        eyebrow="MỖI NGÀY, MỘT CƠ HỘI MỚI"
        title={`Chào ${session.user.display_name},`}
      >
        Cùng xây dựng đội ngũ tiếp theo của bạn.
      </Heading>
      <section className="p-welcome">
        <div>
          <span className="p-eyebrow">TỪ TIỀM NĂNG ĐẾN ĐỒNG HÀNH</span>
          <h2>
            Đúng người.
            <br />
            Vững bước cùng nhau.
          </h2>
          <p>
            Tập trung vào điều quan trọng: hiểu rõ từng ứng viên,
            <br />
            đưa ra lựa chọn có căn cứ và đầy trách nhiệm.
          </p>
          <Link className="button primary" to="/jobs">
            Khám phá vị trí tuyển dụng <ArrowUpRight size={17} />
          </Link>
        </div>
        <div className="p-plant" aria-hidden="true">
          <Sprout strokeWidth={1} />
          <span>Growing together.</span>
        </div>
      </section>
      <div className="p-shortcuts">
        <Link className="p-card p-shortcut" to="/jobs">
          <BriefcaseBusiness />
          <div>
            <h3>Vị trí tuyển dụng</h3>
            <p>Quản lý JD, phê duyệt và hồ sơ ứng tuyển</p>
          </div>
          <ArrowUpRight />
        </Link>
        {session.user.role !== "reviewer" && (
          <Link className="p-card p-shortcut" to="/candidates">
            <Users />
            <div>
              <h3>Hồ sơ ứng viên</h3>
              <p>Tạo hồ sơ và tải CV PDF riêng tư</p>
            </div>
            <ArrowUpRight />
          </Link>
        )}
      </div>
      <section className="p-card">
        <div className="p-section-title">
          <h2>Nhịp tuyển dụng</h2>
          <span className="p-badge">Sắp kết nối</span>
        </div>
        <Empty title="Tổng quan đang được chuẩn bị">
          Số liệu tổng hợp và các hồ sơ cần đánh giá sẽ có tại đây khi dịch vụ
          tổng quan sẵn sàng. Bạn đã có thể quản lý vị trí và hồ sơ từ thanh
          điều hướng.
        </Empty>
      </section>
    </>
  );
}
