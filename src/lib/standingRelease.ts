// נספח ג: טופס בקשה לשחרור ילד/ת גן לפני סיום הלימודים (שחרור קבוע).

export const STANDING_TITLE = "נספח ג: טופס בקשה לשחרור ילד/ת גן לפני סיום הלימודים";
export const STANDING_SUBTITLE = "אישור לשחרור ילד/ת גן לפני סיום הלימודים";
export const STANDING_SUBJECT = "הנדון: שחרור ילד/ה בן/בת שלוש לפני סיום יום הלימודים";
export const STANDING_RESPONSIBILITY =
  "ב. ידוע לי כי ממועד שחרור בני/בתי מהגן לפני סיום יום הלימודים האחריות הבלעדית עליו/עליה תחול עליי או על מי מטעמי.";

export const DEFAULT_RELEASE_TIME = "13:30";
export const NOTES_MAX_LENGTH = 300;

export const MAX_ATTACHMENTS = 3;
export const MAX_FILE_BYTES = 4 * 1024 * 1024; // per file
export const MAX_TOTAL_BYTES = 5 * 1024 * 1024; // all files together (hosting request limit is ~6 MB)
export const ALLOWED_ATTACHMENT_TYPES = ["application/pdf", "image/jpeg", "image/png"];

export interface StoredAttachment {
  path: string; // storage key
  name: string; // original file name, for display
  type: string;
}

export interface StandingReleaseInput {
  kindergartenName: string;
  releaseTime: string; // HH:MM
  startDate: string; // YYYY-MM-DD
  notes: string;
  parent1Name: string;
  parent1Signature: string; // PNG data URL
  parent2Name: string;
  parent2Signature: string;
}

export function standingIntroLines(childName: string, time: string, startDate: string): string[] {
  return [
    `א. אני מבקש/ת לשחרר את בני/בתי ${childName} לפני סיום יום הלימודים.`,
    `אני מבקש/ת לאפשר לה/לו לצאת מהגן בשעה ${time}, החל מתאריך ${startDate}.`,
  ];
}
