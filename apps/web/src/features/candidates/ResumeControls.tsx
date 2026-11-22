import { useEffect, useState } from "react";
import type { Resume } from "@rms-ai/contracts";
import { ActionForm } from "../../app/ui";
import { useWorkspace } from "../../app/context";
import { message } from "../../lib/api/platform";
export function ResumeUpload({
  candidateId,
  onUploaded,
  label = "Tải CV PDF",
}: {
  candidateId: string;
  onUploaded: (r: Resume) => void;
  label?: string;
}) {
  const { client } = useWorkspace();
  const [file, setFile] = useState<File>();
  return (
    <ActionForm
      label={label}
      disabled={!file}
      onSubmit={async () => {
        if (
          !file?.size ||
          file.size > 10485760 ||
          file.type !== "application/pdf"
        )
          throw new Error("Chọn một tệp PDF hợp lệ, tối đa 10 MB.");
        onUploaded(await client.uploadResume(candidateId, file));
      }}
    >
      <label className="p-upload">
        Chọn CV PDF
        <input
          type="file"
          name="cv"
          accept="application/pdf,.pdf"
          required
          onChange={(e) => setFile(e.target.files?.[0])}
        />
      </label>
    </ActionForm>
  );
}
export function ResumeDownload({
  id,
  label = "Tải PDF ↗",
}: {
  id: string;
  label?: string;
}) {
  const { client } = useWorkspace();
  const [url, setUrl] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [url]);
  return (
    <div>
      {url ? (
        <a href={url} target="_blank" rel="noreferrer">
          Mở PDF đã tải ↗
        </a>
      ) : (
        <button
          className="button secondary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              setUrl(URL.createObjectURL(await client.downloadResume(id)));
            } catch (e) {
              setError(message(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Đang tải…" : label}
        </button>
      )}
      {error && (
        <p role="alert" className="p-error">
          {error}
        </p>
      )}
    </div>
  );
}
