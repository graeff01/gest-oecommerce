export function PageHeader({
  title,
  description,
  action,
  eyebrow
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-end">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
        <h1 className="heading-display text-[1.65rem] leading-tight sm:text-[1.9rem] md:text-[2.4rem]">{title}</h1>
        <p className="mt-2 max-w-2xl text-[0.92rem] font-normal leading-6 text-muted">{description}</p>
      </div>
      {action && <div className="flex shrink-0 sm:block">{action}</div>}
    </div>
  );
}
