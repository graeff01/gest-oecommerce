export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-dvh overflow-y-auto overflow-x-hidden bg-surface">
      {children}
    </div>
  );
}
