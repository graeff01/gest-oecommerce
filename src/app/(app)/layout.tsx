import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { Topbar } from "@/components/topbar";
import { getSession } from "@/lib/auth";
import { getStoreSettings } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getStoreSettings();
  return {
    title: {
      default: settings.storeName,
      template: `%s — ${settings.storeName}`
    }
  };
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await connection();
  const [user, settings] = await Promise.all([getSession(), getStoreSettings()]);

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="h-dvh w-full overflow-hidden p-2 pb-[calc(5.75rem+env(safe-area-inset-bottom))] sm:p-3 lg:p-4 lg:pb-4">
      <AppSidebar storeName={settings.storeName} storeTagline={settings.storeTagline} />
      <main className="grid h-full min-w-0 content-start gap-4 overflow-y-auto overflow-x-hidden pb-2 pr-0 sm:gap-5 lg:ml-[276px] lg:pb-0 lg:pr-1">
        <Topbar user={user} />
        {children}
      </main>
    </div>
  );
}
