// Default wording for the health declaration shown to parents and printed
// into the signed PDF. Admins can edit it per event.
export const DEFAULT_HEALTH_DECLARATION_TEXT = [
  "אני מצהיר/ה כי בני/בתי בריא/ה ומסוגל/ת להשתתף באירוע, וכי לא ידועה לי כל מגבלה רפואית שעלולה למנוע את השתתפותו/ה, מלבד מה שפירטתי להלן.",
  "אני מתחייב/ת לעדכן את הגננת על כל שינוי במצבו/ה הבריאותי של הילד/ה עד מועד האירוע.",
  "במקרה חירום ולא אצליח להיות זמינ/ה, אני מאשר/ת לצוות להעניק עזרה ראשונה ולפנות את הילד/ה לטיפול רפואי דחוף.",
].join("\n");

export const HEALTH_NOTES_LABEL =
  "רגישויות, אלרגיות, מחלות כרוניות או תרופות שהצוות צריך להכיר (רשות)";

/** Each non-empty line of the declaration text is a separate clause the parent must approve. */
export function splitHealthClauses(text: string | null | undefined): string[] {
  const source = text?.trim() ? text : DEFAULT_HEALTH_DECLARATION_TEXT;
  return source
    .replace(/\r/g, "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

export const HEALTH_NOTES_MAX_LENGTH = 1000;
