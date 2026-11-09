// נספח ג: טופס בקשה לשחרור ילד/ת גן לפני סיום הלימודים (שחרור קבוע).

export const STANDING_TITLE = "נספח ג: טופס בקשה לשחרור ילד/ת גן לפני סיום הלימודים";
export const STANDING_SUBTITLE = "אישור לשחרור ילד/ת גן לפני סיום הלימודים";
export const STANDING_SUBJECT = "הנדון: שחרור ילד/ה (בני גיל 3 ומעלה) לפני סיום יום הלימודים";
export const STANDING_RESPONSIBILITY =
  "ב. ידוע לי כי ממועד שחרור בני/בתי מהגן לפני סיום יום הלימודים האחריות הבלעדית עליו/עליה תחול עליי או על מי מטעמי.";

export const NOTES_MAX_LENGTH = 300;
export const REASON_MAX_LENGTH = 150;

export const MAX_ATTACHMENTS = 3;
export const MAX_FILE_BYTES = 4 * 1024 * 1024; // per file
export const MAX_TOTAL_BYTES = 5 * 1024 * 1024; // all files together (hosting request limit is ~6 MB)
export const ALLOWED_ATTACHMENT_TYPES = ["application/pdf", "image/jpeg", "image/png"];

// ---- Release types, days and allowed hours ----

export type ReleaseType = "daycare" | "adaptation" | "other";

export const RELEASE_TYPES: { value: ReleaseType; label: string; hint: string }[] = [
  { value: "daycare", label: "צהרון", hint: "שחרור ב-13:30, בימים א עד ה" },
  { value: "adaptation", label: "הסתגלות", hint: "שחרור ב-13:30, בימים א עד ה" },
  { value: "other", label: "אחר (למשל טיפול)", hint: "שעה גמישה: עד 13:30, ובימי שישי עד 12:00" },
];

export function releaseTypeLabel(t: string): string {
  return RELEASE_TYPES.find((r) => r.value === t)?.label ?? t;
}

/** 0 = Sunday ... 5 = Friday */
export const DAYS: { index: number; short: string; name: string }[] = [
  { index: 0, short: "א", name: "ראשון" },
  { index: 1, short: "ב", name: "שני" },
  { index: 2, short: "ג", name: "שלישי" },
  { index: 3, short: "ד", name: "רביעי" },
  { index: 4, short: "ה", name: "חמישי" },
  { index: 5, short: "ו", name: "שישי" },
];

export const FIXED_TIME = "13:30";
export const EARLIEST_TIME = "09:00";
export const LATEST_WEEKDAY_TIME = "13:30";
export const LATEST_FRIDAY_TIME = "12:00";

export interface ScheduleEntry {
  day: number;
  time: string; // HH:MM
}

export function latestTimeFor(day: number): string {
  return day === 5 ? LATEST_FRIDAY_TIME : LATEST_WEEKDAY_TIME;
}

/** Every allowed hour for a day, in 5 minute steps (09:00 up to the day's latest time). */
export function timeOptionsFor(day: number): string[] {
  const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
  const out: string[] = [];
  for (let m = toMin(EARLIEST_TIME); m <= toMin(latestTimeFor(day)); m += 5) {
    out.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
  }
  return out;
}

export function isFixedType(t: ReleaseType): boolean {
  return t === "daycare" || t === "adaptation";
}

/** Returns a message in Hebrew when the requested days and hours break the rules, otherwise null. */
export function validateSchedule(type: ReleaseType, schedule: ScheduleEntry[]): string | null {
  if (schedule.length === 0) return "יש לבחור לפחות יום אחד.";
  const seen = new Set<number>();
  for (const e of schedule) {
    if (!Number.isInteger(e.day) || e.day < 0 || e.day > 5 || seen.has(e.day)) return "הימים שנבחרו אינם תקינים.";
    seen.add(e.day);
    const dayName = DAYS[e.day].name;
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(e.time)) return `יש לבחור שעה ליום ${dayName}.`;
    if (isFixedType(type)) {
      if (e.day === 5) return "צהרון והסתגלות אפשריים בימים א עד ה בלבד.";
      if (e.time !== FIXED_TIME) return `בצהרון ובהסתגלות שעת השחרור היא ${FIXED_TIME}.`;
    } else {
      if (e.time < EARLIEST_TIME) return `שעת השחרור המוקדמת ביותר היא ${EARLIEST_TIME} (יום ${dayName}).`;
      if (e.time > latestTimeFor(e.day)) {
        return e.day === 5
          ? `ביום שישי אפשר לבחור שעת שחרור עד ${LATEST_FRIDAY_TIME}.`
          : `אפשר לבחור שעת שחרור עד ${LATEST_WEEKDAY_TIME} (יום ${dayName}).`;
      }
    }
  }
  return null;
}

/** "בימים א, ג בשעה 13:00 וביום ו בשעה 11:30" (days with the same hour are grouped). */
export function scheduleSentence(schedule: ScheduleEntry[]): string {
  const sorted = [...schedule].sort((a, b) => a.day - b.day);
  const groups = new Map<string, number[]>();
  for (const e of sorted) groups.set(e.time, [...(groups.get(e.time) ?? []), e.day]);
  const parts = Array.from(groups.entries()).map(([time, days], i) => {
    const letters = days.map((d) => DAYS[d].short).join(", ");
    const text = `${days.length === 1 ? "ביום" : "בימים"} ${letters} בשעה ${time}`;
    return i === 0 ? text : `ו${text}`;
  });
  return parts.join(" ");
}

/** Short form for lists, e.g. "א, ג 13:00 | ו 11:30". */
export function scheduleShort(schedule: ScheduleEntry[]): string {
  const sorted = [...schedule].sort((a, b) => a.day - b.day);
  const groups = new Map<string, number[]>();
  for (const e of sorted) groups.set(e.time, [...(groups.get(e.time) ?? []), e.day]);
  return Array.from(groups.entries())
    .map(([time, days]) => `${days.map((d) => DAYS[d].short).join(", ")} ${time}`)
    .join(" | ");
}

export interface StoredAttachment {
  path: string; // storage key
  name: string; // original file name, for display
  type: string;
}

export interface StandingReleaseInput {
  kindergartenName: string;
  releaseType: ReleaseType;
  reasonText: string;
  schedule: ScheduleEntry[];
  startDate: string; // YYYY-MM-DD
  notes: string;
  parent1Name: string;
  parent1Signature: string; // PNG data URL
  parent2Name: string;
  parent2Signature: string;
}

export function standingIntroLines(childName: string, schedule: ScheduleEntry[], startDate: string): string[] {
  return [
    `א. אני מבקש/ת לשחרר את בני/בתי ${childName} לפני סיום יום הלימודים.`,
    `אני מבקש/ת לאפשר לה/לו לצאת מהגן ${scheduleSentence(schedule)}, החל מתאריך ${startDate}.`,
  ];
}
