"use client";

import { BulkDownloadButton } from "@/components/BulkDownloadButton";
import { getEventExportAction } from "../../exportActions";

export function EventBulkDownload({ eventId }: { eventId: string }) {
  return (
    <BulkDownloadButton
      label="הורדת כל האישורים (ZIP)"
      load={() => getEventExportAction(eventId)}
    />
  );
}
