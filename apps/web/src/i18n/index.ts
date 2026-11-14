import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const vi = {
  appName: 'RMS AI', language: 'Ngôn ngữ', logout: 'Đăng xuất', loading: 'Đang tải…',
  nav: { jobs: 'Vị trí tuyển dụng', candidates: 'Ứng viên', orgs: 'Tổ chức' },
  auth: {
    login: 'Đăng nhập', register: 'Tạo tài khoản', email: 'Email', password: 'Mật khẩu',
    displayName: 'Tên hiển thị', orgName: 'Tên tổ chức', haveAccount: 'Đã có tài khoản? Đăng nhập',
    noAccount: 'Chưa có tài khoản? Đăng ký',
  },
  orgs: { title: 'Chọn tổ chức', none: 'Bạn chưa thuộc tổ chức nào', active: 'Đang dùng', open: 'Chọn' },
  jobs: { title: 'Vị trí tuyển dụng', new: 'Tạo vị trí', jobTitle: 'Tên vị trí', description: 'Mô tả', create: 'Tạo', empty: 'Chưa có vị trí nào', status: 'Trạng thái', back: '← Danh sách', save: 'Lưu' },
  candidates: { title: 'Ứng viên', new: 'Thêm ứng viên', name: 'Họ tên', email: 'Email', create: 'Thêm', empty: 'Chưa có ứng viên nào', resumes: 'CV', upload: 'Tải CV lên (PDF hoặc DOCX)', noResumes: 'Chưa có CV', download: 'Tải xuống', deduplicated: 'CV này đã có, dùng lại bản cũ', delete: 'Xoá' },
  status: { uploaded: 'Đã tải lên', queued: 'Đang chờ', validating: 'Đang kiểm tra', extracting: 'Đang trích xuất', indexing: 'Đang lập chỉ mục', ready: 'Sẵn sàng', rejected: 'Bị từ chối', failed_extraction: 'Lỗi trích xuất', failed_provider: 'Lỗi dịch vụ AI', cancelled: 'Đã huỷ' },
  profile: { title: 'Hồ sơ đã trích xuất', manualReview: 'Cần người xem lại: văn bản trích xuất quá ngắn hoặc chất lượng kém.', ocr: 'Văn bản được nhận dạng bằng OCR, có thể có lỗi.', years: 'Số năm kinh nghiệm: {{n}}', skills: 'Kỹ năng', education: 'Học vấn', languages: 'Ngôn ngữ' },
  screening: {
    title: 'Sàng lọc', applications: 'Ứng viên của vị trí', noApplications: 'Chưa có ứng viên nào được gắn vào vị trí này',
    run: 'Sàng lọc', runs: 'Các lượt sàng lọc', noRuns: 'Chưa có lượt sàng lọc nào', view: 'Xem', close: 'Đóng',
    score: 'Điểm quan sát', coverage: 'Độ phủ', range: 'Khoảng điểm', manualReview: 'Cần người xem lại',
    insufficient: 'Chưa đủ bằng chứng để cho điểm (độ phủ thấp hơn ngưỡng).',
    criterion: 'Tiêu chí', level: 'Mức', weight: 'Trọng số', evidence: 'Bằng chứng', reason: 'Lý do', noEvidence: 'Không có bằng chứng',
    mustHave: 'bắt buộc', model: 'Mô hình', cvUnavailable: 'Không tải được văn bản CV; chỉ hiển thị trích dẫn.',
    needsReview: 'Mô hình kết luận nhưng không có trích dẫn khớp với CV, nên cần người xem lại.',
    runStatus: { queued: 'Đang chờ', waiting_document: 'Chờ CV xử lý xong', retrieving: 'Đang truy xuất', assessing: 'Đang chấm', validating: 'Đang kiểm tra', scoring: 'Đang tính điểm', completed: 'Hoàn tất', failed_validation: 'Lỗi kiểm tra', failed_provider: 'Lỗi dịch vụ AI', cancelled: 'Đã huỷ' },
    levels: { strong: 'Mạnh', adequate: 'Đạt', partial: 'Một phần', absent: 'Không có', unknown: 'Chưa rõ', needs_review: 'Cần xem lại' },
  },
  readOnly: 'Vai trò của bạn chỉ được xem.',
  error: 'Có lỗi xảy ra',
};
const en: typeof vi = {
  appName: 'RMS AI', language: 'Language', logout: 'Sign out', loading: 'Loading…',
  nav: { jobs: 'Jobs', candidates: 'Candidates', orgs: 'Organizations' },
  auth: {
    login: 'Sign in', register: 'Create account', email: 'Email', password: 'Password',
    displayName: 'Display name', orgName: 'Organization name', haveAccount: 'Have an account? Sign in',
    noAccount: 'No account? Register',
  },
  orgs: { title: 'Choose organization', none: 'You do not belong to any organization', active: 'Active', open: 'Select' },
  jobs: { title: 'Jobs', new: 'New job', jobTitle: 'Job title', description: 'Description', create: 'Create', empty: 'No jobs yet', status: 'Status', back: '← Jobs', save: 'Save' },
  candidates: { title: 'Candidates', new: 'Add candidate', name: 'Full name', email: 'Email', create: 'Add', empty: 'No candidates yet', resumes: 'Resumes', upload: 'Upload resume (PDF or DOCX)', noResumes: 'No resumes yet', download: 'Download', deduplicated: 'This resume already exists; reusing it', delete: 'Delete' },
  status: { uploaded: 'Uploaded', queued: 'Queued', validating: 'Validating', extracting: 'Extracting', indexing: 'Indexing', ready: 'Ready', rejected: 'Rejected', failed_extraction: 'Extraction failed', failed_provider: 'AI provider failed', cancelled: 'Cancelled' },
  profile: { title: 'Extracted profile', manualReview: 'Needs human review: extracted text is too short or poor quality.', ocr: 'Text was recognized with OCR and may contain errors.', years: 'Years of experience: {{n}}', skills: 'Skills', education: 'Education', languages: 'Languages' },
  screening: {
    title: 'Screening', applications: 'Applications', noApplications: 'No candidates have been added to this job',
    run: 'Screen', runs: 'Screening runs', noRuns: 'No screening runs yet', view: 'View', close: 'Close',
    score: 'Observed score', coverage: 'Coverage', range: 'Score range', manualReview: 'Needs human review',
    insufficient: 'Not enough evidence to give a score (coverage is below the threshold).',
    criterion: 'Criterion', level: 'Level', weight: 'Weight', evidence: 'Evidence', reason: 'Reason', noEvidence: 'No evidence',
    mustHave: 'must have', model: 'Model', cvUnavailable: 'Could not load the CV text; showing quotes only.',
    needsReview: 'The model reached a conclusion without a quote that matches the CV, so a person should review it.',
    runStatus: { queued: 'Queued', waiting_document: 'Waiting for the resume', retrieving: 'Retrieving', assessing: 'Assessing', validating: 'Validating', scoring: 'Scoring', completed: 'Completed', failed_validation: 'Validation failed', failed_provider: 'AI service failed', cancelled: 'Cancelled' },
    levels: { strong: 'Strong', adequate: 'Adequate', partial: 'Partial', absent: 'Absent', unknown: 'Unknown', needs_review: 'Needs review' },
  },
  readOnly: 'Your role is read-only.',
  error: 'Something went wrong',
};

let saved: string | null = null;
try { saved = localStorage.getItem('rms.lang'); } catch { /* bỏ qua */ }

void i18n.use(initReactI18next).init({
  resources: { vi: { translation: vi }, en: { translation: en } },
  lng: saved === 'en' ? 'en' : 'vi',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
