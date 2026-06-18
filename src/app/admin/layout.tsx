import { PineconeMark } from "@/components/PineconeMark";
import Link from "next/link";
import { signOutAction } from "./actions";
import { LogOut, CalendarDays, Users } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 flex flex-col">
      <header className="bg-pine text-card">
        <div className="max-w-4xl mx-auto px-5 py-4 flex items-center justify-between">
          <Link href="/admin/dashboard" className="flex items-center gap-2.5">
            <PineconeMark className="h-7 w-7" />
            <div>
              <p className="font-display text-lg leading-tight">גן אצטרובל</p>
              <p className="text-xs text-sage-light/80 leading-tight">ניהול</p>
            </div>
          </Link>
          <nav className="flex items-center gap-1">
            <Link
              href="/admin/dashboard"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm hover:bg-white/10 transition-colors"
            >
              <CalendarDays className="h-4 w-4" />
              <span className="hidden sm:inline">אירועים</span>
            </Link>
            <Link
              href="/admin/children"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm hover:bg-white/10 transition-colors"
            >
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">ילדים</span>
            </Link>
            <form action={signOutAction}>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm hover:bg-white/10 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">התנתקות</span>
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-4xl w-full mx-auto px-5 py-8">{children}</main>
    </div>
  );
}
