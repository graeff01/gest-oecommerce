export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-dvh overflow-y-auto bg-[rgb(248_247_244)] dark:bg-[rgb(10_10_16)]">
      {children}
    </div>
  );
}
