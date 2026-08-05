import { Card } from "@/components/ui/card";
import { ROUTES } from "@/lib/routes";
import { RouteGuard } from "@/features/auth/components/route-guard";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <RouteGuard mode="anonymous">
      <div className="flex min-h-screen flex-col">
        <header className="flex h-16 items-center justify-center border-b border-slate-200 bg-white">
          <a
            href={ROUTES.home}
            className="text-lg font-semibold text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 rounded-lg px-2 py-1"
          >
            AralAI
          </a>
        </header>
        <main className="flex flex-1 items-start justify-center px-4 py-10 sm:py-14">
          <Card className="w-full max-w-md">
            <main id="main-content" className="focus-visible:outline-none">
              {children}
            </main>
          </Card>
        </main>
      </div>
    </RouteGuard>
  );
}