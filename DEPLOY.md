# 🌲 גן אצטרובל — מדריך הפצה

## סטאטוס מוכנות

✅ Supabase DB + RLS + Storage — **חי ופעיל**
✅ Next.js app — קומפייל נקי, 0 שגיאות TypeScript/ESLint
✅ PDF generation with Hebrew RTL — נבדק ויזואלית
✅ כל הקוד ב-git commit מוכן לפריסה

---

## שלב 1 — העלאת הקוד ל-GitHub

```bash
# צרו ריפו חדש ב-github.com, אחר כך:
cd gan-itztrubal
git remote add origin https://github.com/YOUR_USERNAME/gan-itztrubal.git
git push -u origin main
```

---

## שלב 2 — פריסה ל-Vercel

1. היכנסו ל-[vercel.com/new](https://vercel.com/new)
2. בחרו **Import Git Repository** → בחרו את `gan-itztrubal`
3. Framework Preset: **Next.js** (זוהה אוטומטית)
4. הוסיפו Environment Variables (לחצו **Add**):

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://ehmatzsiqkksqhufofyd.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (המפתח המלא מהקובץ .env.local) |

5. לחצו **Deploy** — הפריסה תיקח כ-2 דקות

---

## שלב 3 — הגדרת Google OAuth

### ב-Google Cloud Console
1. היכנסו ל-[console.cloud.google.com](https://console.cloud.google.com)
2. צרו פרויקט חדש (או בחרו קיים)
3. APIs & Services → **OAuth consent screen**:
   - User Type: **External**
   - App name: `גן אצטרובל`
   - Support email: כתובת הגימייל שלכם
   - Authorized domains: `ehmatzsiqkksqhufofyd.supabase.co`
4. APIs & Services → **Credentials** → Create Credentials → **OAuth 2.0 Client ID**:
   - Application type: **Web application**
   - Authorized redirect URIs — הוסיפו **שתי** כתובות:
     ```
     https://ehmatzsiqkksqhufofyd.supabase.co/auth/v1/callback
     https://YOUR-VERCEL-URL.vercel.app/auth/callback
     ```
5. העתיקו את **Client ID** ו-**Client Secret**

### ב-Supabase
1. היכנסו ל-[supabase.com/dashboard](https://supabase.com/dashboard) → פרויקט `gan-itztrubal-consent-forms`
2. Authentication → **Providers** → Google → **Enable**
3. הדביקו את Client ID ו-Client Secret
4. לחצו **Save**
5. Authentication → **URL Configuration**:
   - Site URL: `https://YOUR-VERCEL-URL.vercel.app`
   - Redirect URLs: הוסיפו `https://YOUR-VERCEL-URL.vercel.app/**`

---

## שלב 4 — הוספת אדמין ראשון

הריצו ב-Supabase SQL Editor:

```sql
INSERT INTO admin_allowlist (email, full_name)
VALUES ('YOUR-EMAIL@gmail.com', 'שם המנהלת');
```

> להוספת אדמינים נוספים בעתיד — אותה פקודה עם אימייל אחר.
> אפשר גם מתוך הדשבורד עצמו ב-**ניהול → מנהלים** (אם תרצו, אוסיף מסך כזה בגרסה הבאה).

---

## שלב 5 — ייבוא רשימת הילדים

1. התחברו ל-`https://YOUR-VERCEL-URL.vercel.app/admin/login` עם Google
2. לכו ל-**ילדים** בתפריט
3. לחצו **ייבוא רשימה מאקסל** והעלו קובץ עם עמודת `שם` (ואם רוצים `כיתה`)

---

## שלב 6 — Supabase Auth Redirect URL

חשוב: לאחר שיש לכם URL סופי של Vercel, עדכנו ב-Supabase:
- Authentication → URL Configuration → Site URL

---

## מבנה הפרויקט

```
src/
├── app/
│   ├── page.tsx                    # דף הבית - רשימת אירועים להורים
│   ├── event/[eventId]/            # טופס ההסכמה (בחירת ילד + חתימה)
│   ├── admin/
│   │   ├── dashboard/              # לוח בקרה - ניהול אירועים
│   │   ├── events/[eventId]/       # עריכת אירוע + צפייה בהגשות
│   │   ├── children/               # ניהול רשימת ילדים + ייבוא Excel
│   │   └── login/                  # כניסה עם Google
│   └── api/submit-consent/         # API: יצירת PDF + שמירה ב-Supabase Storage
├── components/
│   ├── ConsentForm.tsx             # הטופס המרכזי להורים
│   ├── SignaturePad.tsx            # לוח חתימה דיגיטלית
│   ├── ChildPicker.tsx             # חיפוש ובחירת ילד
│   └── PineconeMark.tsx            # לוגו האצטרובל
└── lib/
    ├── pdf/generateConsentPdf.ts   # יצירת PDF עם טקסט עברי RTL
    ├── pdf/rtlText.ts              # מנוע bidi עברי מותאם ל-pdf-lib
    └── supabase/                   # Supabase clients (browser + server)
```

---

## פרטי Supabase לגיבוי

- **Project ID:** `ehmatzsiqkksqhufofyd`
- **Region:** `eu-west-1` (Frankfurt)
- **Dashboard:** https://supabase.com/dashboard/project/ehmatzsiqkksqhufofyd

---

## שאלות נפוצות

**ההורה ניסה להגיש פעמיים — מה קורה?**
המערכת מחזירה שגיאה נוחה ("הטופס כבר הוגש"). רשומות ייחודיות מובטחות ע"י UNIQUE constraint על `(event_id, child_id)`.

**איך אפשר להוסיף אירוע?**
דשבורד הניהול → "אירוע חדש" — פשוט וידידותי.

**ה-PDF מאוחסן איפה?**
Supabase Storage, bucket פרטי `consent-pdfs`. הורדה רק דרך לינק חתום עם תוקף של 5 דקות, שנוצר server-side רק לאדמין מחובר.
