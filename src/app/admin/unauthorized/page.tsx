import { Card } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { PineconeMark } from "@/components/PineconeMark";
import { signOutAction } from "../actions";

export default function UnauthorizedPage() {
  return (
    <div className="flex-1 flex items-center justify-center px-5 py-10">
      <Card className="p-8 w-full max-w-sm text-center">
        <PineconeMark className="h-12 w-12 mx-auto text-clay mb-4" />
        <h1 className="text-xl font-display text-pine mb-2">הגישה לא מורשית</h1>
        <p className="text-sm text-pine-dark/70 leading-relaxed mb-6">
          חשבון ה-Google שהתחברתם איתו אינו ברשימת הצוות המורשה. פנו להנהלת הגן
          להוספת החשבון, או התחברו עם חשבון אחר.
        </p>
        <form action={signOutAction}>
          <Button type="submit" variant="secondary" className="w-full">
            התחברות עם חשבון אחר
          </Button>
        </form>
      </Card>
    </div>
  );
}
