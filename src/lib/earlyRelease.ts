// Wording and helpers for the early release form ("אישור שחרור מוקדם מהגן").

export const EARLY_RELEASE_INTRO =
  "אני, החתום מטה, כהורה או כאפוטרופוס חוקי של הילד/ה {child} ת.ז. {childId}, מבקש בזאת לאשר את שחרורו/ה המוקדם של בני/בתי מהגן במהלך שנת הלימודים, בהתאם לפרטים הבאים:";

// Each clause gets its own checkbox on the form and its own checked box in the PDF.
export const EARLY_RELEASE_CLAUSES: string[] = [
  "אני מצהיר ומסכים בזאת כי מרגע יציאת הילד/ה משער הגן ו/או מסירתו/ה לידי המבוגר המאסף שצוין לעיל, פוקעת ומבוטלת כל אחריות של הגננת, צוות הגן, משרד החינוך או הרשות המקומית לשלומו/ה, לבריאותו/ה ולביטחונו/ה של הילד/ה.",
  "ידוע לי והדבר מוסכם עליי כי האחריות המלאה על הילד/ה מרגע השחרור והלאה חלה עליי ועל המבוגר המאסף בלבד, ולא תהיה לי, ליורשיי או למי מטעמי כל טענה, דרישה, קובלנה או תביעה משפטית כלפי הגננת או צוות הגן בגין כל אירוע, פגיעה או נזק שיגרמו לאחר מועד השחרור.",
  "אני מתחייב כי המבוגר המאסף הינו מעל הגיל החוקי הנדרש, וכי ידוע לו שעליו להציג תעודה מזהה בפני צוות הגן במידה ויתבקש לכך.",
];

export interface EarlyReleaseFormInput {
  teacherName: string;
  parentFullName: string;
  parentIdNumber: string;
  parentPhone: string;
  childIdNumber: string;
  releaseTime: string; // HH:MM
  pickupName: string;
  pickupRelation: string;
  pickupPhone: string;
  clausesChecked: boolean;
  signatureDataUrl: string;
}

/** Today's date in Israel as YYYY-MM-DD (the release date is never taken from the browser). */
export function todayInIsrael(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(new Date());
}

/** YYYY-MM-DD -> DD.MM.YYYY */
export function formatReleaseDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

export const ID_NUMBER_PATTERN = /^\d{5,9}$/;
export const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
