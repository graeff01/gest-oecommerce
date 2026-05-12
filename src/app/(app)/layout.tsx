import { connection } from "next/server";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { Topbar } from "@/components/topbar";
import { getSession } from "@/lib/auth";
import { getStoreSettings } from "@/lib/settings";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await connection();
  const [user, settings] = await Promise.all([getSession(), getStoreSettings()]);

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="h-dvh w-full overflow-hidden p-3 pb-24 lg:p-4 lg:pb-4">
      <AppSidebar storeName={settings.storeName} storeTagline={settings.storeTagline} />
      <main className="grid h-full min-w-0 content-start gap-5 overflow-y-auto overflow-x-hidden pr-0 lg:ml-[276px] lg:pr-1">
        <Topbar user={user} />
        {children}
      </main>
    </div>
  );
}
