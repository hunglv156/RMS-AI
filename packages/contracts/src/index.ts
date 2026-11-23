import type { components } from "./generated";
export type { components, operations, paths } from "./generated";
export type Role = components["schemas"]["Role"];
export type Decision = components["schemas"]["Decision"];
export type RunStatus = components["schemas"]["RunStatus"];
export type Level = components["schemas"]["Level"];
export type Error = components["schemas"]["Error"];
export type ActorDisplay = components["schemas"]["ActorDisplay"];
export type User = components["schemas"]["User"];
export type LoginRequest = components["schemas"]["LoginRequest"];
export type Session = components["schemas"]["Session"];
export type CreateUser = components["schemas"]["CreateUser"];
export type UpdateUser = components["schemas"]["UpdateUser"];
export type Job = components["schemas"]["Job"];
export type CreateJob = components["schemas"]["CreateJob"];
export type UpdateJob = components["schemas"]["UpdateJob"];
export type Assignments = components["schemas"]["Assignments"];
export type Criterion = components["schemas"]["Criterion"];
export type JobDescription = components["schemas"]["JobDescription"];
export type JdDraft = components["schemas"]["JdDraft"];
export type UpdateJd = components["schemas"]["UpdateJd"];
export type RevisionRequest = components["schemas"]["RevisionRequest"];
export type ReturnToDraft = components["schemas"]["ReturnToDraft"];
export type JdVersion = components["schemas"]["JdVersion"];
export type CandidateInput = components["schemas"]["CandidateInput"];
export type UpdateCandidate = components["schemas"]["UpdateCandidate"];
export type Candidate = components["schemas"]["Candidate"];
export type Resume = components["schemas"]["Resume"];
export type CreateApplication = components["schemas"]["CreateApplication"];
export type UpdateApplication = components["schemas"]["UpdateApplication"];
export type Application = components["schemas"]["Application"];
export type Manifest = components["schemas"]["Manifest"];
export type ScreeningConfig = components["schemas"]["ScreeningConfig"];
export type SourcePage = components["schemas"]["SourcePage"];
export type Source = components["schemas"]["Source"];
export type EvidenceQuote = components["schemas"]["EvidenceQuote"];
export type QuoteVerification = components["schemas"]["QuoteVerification"];
export type CriterionAssessment = components["schemas"]["CriterionAssessment"];
export type ScreenedCriterion = components["schemas"]["ScreenedCriterion"];
export type ScoreOutput = components["schemas"]["ScoreOutput"];
export type PipelineConfig = components["schemas"]["PipelineConfig"];
export type ActiveConfig = components["schemas"]["ActiveConfig"];
export type LLMMetadata = components["schemas"]["LLMMetadata"];
export type ScreeningResult = components["schemas"]["ScreeningResult"];
export type ScreeningEnvelope = components["schemas"]["ScreeningEnvelope"];
export type StartScreening = components["schemas"]["StartScreening"];
export type RunSummary = components["schemas"]["RunSummary"];
export type RunDetail = components["schemas"]["RunDetail"];
export type AcceptedRuns = components["schemas"]["AcceptedRuns"];
export type CreateReview = components["schemas"]["CreateReview"];
export type HumanReview = components["schemas"]["HumanReview"];
export type AuditEvent = components["schemas"]["AuditEvent"];
export type Dashboard = components["schemas"]["Dashboard"];
export type InputSnapshot = components["schemas"]["InputSnapshot"];
export type UserPage = components["schemas"]["UserPage"];
export type JobPage = components["schemas"]["JobPage"];
export type CandidatePage = components["schemas"]["CandidatePage"];
export type JdVersionPage = components["schemas"]["JdVersionPage"];
export type UploadResume = components["schemas"]["UploadResume"];
export type ApplicationPage = components["schemas"]["ApplicationPage"];
export type RunSummaryPage = components["schemas"]["RunSummaryPage"];
export type HumanReviewPage = components["schemas"]["HumanReviewPage"];
export type AuditEventPage = components["schemas"]["AuditEventPage"];
export type SampleJds = components["schemas"]["SampleJds"];
export type AiScreeningRequest = components["schemas"]["AiScreeningRequest"];

/** Same-origin client seam; implementations must send credentials and mutation CSRF headers. */
export interface ListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  sort?: string;
}
export interface PlatformClient {
  login(input: LoginRequest, signal?: AbortSignal): Promise<Session>;
  logout(signal?: AbortSignal): Promise<void>;
  me(signal?: AbortSignal): Promise<Session>;
  users(
    query?: ListQuery & { role?: Role },
    signal?: AbortSignal,
  ): Promise<UserPage>;
  createUser(input: CreateUser, signal?: AbortSignal): Promise<User>;
  updateUser(
    id: string,
    input: UpdateUser,
    signal?: AbortSignal,
  ): Promise<User>;
  jobs(
    query?: ListQuery & { status?: "open" | "closed" },
    signal?: AbortSignal,
  ): Promise<JobPage>;
  job(id: string, signal?: AbortSignal): Promise<Job>;
  createJob(input: CreateJob, signal?: AbortSignal): Promise<Job>;
  updateJob(id: string, input: UpdateJob, signal?: AbortSignal): Promise<Job>;
  assignReviewers(
    id: string,
    input: Assignments,
    signal?: AbortSignal,
  ): Promise<Assignments>;
  jdVersions(
    jobId: string,
    query?: ListQuery,
    signal?: AbortSignal,
  ): Promise<JdVersionPage>;
  jdVersion(id: string, signal?: AbortSignal): Promise<JdVersion>;
  createJd(
    jobId: string,
    input: JdDraft,
    signal?: AbortSignal,
  ): Promise<JdVersion>;
  updateJd(
    id: string,
    input: UpdateJd,
    signal?: AbortSignal,
  ): Promise<JdVersion>;
  submitJd(
    id: string,
    input: RevisionRequest,
    signal?: AbortSignal,
  ): Promise<JdVersion>;
  returnJdToDraft(
    id: string,
    input: ReturnToDraft,
    signal?: AbortSignal,
  ): Promise<JdVersion>;
  approveJd(
    id: string,
    input: RevisionRequest,
    signal?: AbortSignal,
  ): Promise<JdVersion>;
  cloneJd(
    id: string,
    input: RevisionRequest,
    signal?: AbortSignal,
  ): Promise<JdVersion>;
  candidates(query?: ListQuery, signal?: AbortSignal): Promise<CandidatePage>;
  candidate(id: string, signal?: AbortSignal): Promise<Candidate>;
  createCandidate(
    input: CandidateInput,
    signal?: AbortSignal,
  ): Promise<Candidate>;
  updateCandidate(
    id: string,
    input: UpdateCandidate,
    signal?: AbortSignal,
  ): Promise<Candidate>;
  uploadResume(
    candidateId: string,
    cv: File,
    signal?: AbortSignal,
  ): Promise<Resume>;
  downloadResume(id: string, signal?: AbortSignal): Promise<Blob>;
  applications(
    jobId: string,
    query?: ListQuery,
    signal?: AbortSignal,
  ): Promise<ApplicationPage>;
  createApplication(
    jobId: string,
    input: CreateApplication,
    signal?: AbortSignal,
  ): Promise<Application>;
  updateApplication(
    id: string,
    input: UpdateApplication,
    signal?: AbortSignal,
  ): Promise<Application>;
  screeningConfig(signal?: AbortSignal): Promise<ScreeningConfig>;
  startScreening(
    jobId: string,
    input: StartScreening,
    idempotencyKey: string,
    signal?: AbortSignal,
  ): Promise<AcceptedRuns>;
  screening(id: string, signal?: AbortSignal): Promise<RunDetail>;
  screeningHistory(
    applicationId: string,
    query?: ListQuery,
    signal?: AbortSignal,
  ): Promise<RunSummaryPage>;
  retryScreening(
    id: string,
    idempotencyKey: string,
    signal?: AbortSignal,
  ): Promise<AcceptedRuns>;
  review(
    id: string,
    input: CreateReview,
    signal?: AbortSignal,
  ): Promise<HumanReview>;
  reviewHistory(
    applicationId: string,
    query?: ListQuery,
    signal?: AbortSignal,
  ): Promise<HumanReviewPage>;
  dashboard(signal?: AbortSignal): Promise<Dashboard>;
  auditEvents(
    query?: ListQuery & {
      action?: string;
      resource_type?: string;
      resource_id?: string;
      job_id?: string;
      from?: string;
      to?: string;
    },
    signal?: AbortSignal,
  ): Promise<AuditEventPage>;
}
