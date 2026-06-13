import { allowedAttachmentMimeTypes } from "@/lib/attachments/config";

type AttachmentUploadFormProps = {
  action: (formData: FormData) => Promise<void>;
  idPrefix?: string;
};

export function AttachmentUploadForm({
  action,
  idPrefix = "attachment",
}: AttachmentUploadFormProps) {
  const fileId = `${idPrefix}-file`;

  return (
    <form className="form-grid" action={action} encType="multipart/form-data">
      <label htmlFor={fileId}>File</label>
      <input
        accept={allowedAttachmentMimeTypes.join(",")}
        id={fileId}
        name="file"
        type="file"
        required
      />
      <button type="submit">Upload attachment</button>
    </form>
  );
}
