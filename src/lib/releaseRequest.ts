// "טופס שחרור ילד/ה מהגן לפני סיום יום הלימודים" (נוסח משרד החינוך).

export const RELEASE_REQUEST_TITLE = "טופס שחרור ילד/ה מהגן לפני סיום יום הלימודים";
export const DEFAULT_KINDERGARTEN_NAME = "אצטרובל";
export const REASON_MAX_LENGTH = 400;

export interface ReleaseRequestInput {
  teacherName: string;
  kindergartenName: string;
  requestDate: string; // YYYY-MM-DD
  fromTime: string; // HH:MM
  toTime: string; // HH:MM
  parentFullName: string;
  parentRelation: string;
  pickupName: string;
  pickupPhone: string;
  reason: string;
  signatureDataUrl: string;
}
