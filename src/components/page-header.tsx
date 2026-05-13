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
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
        <h1 className="heading-display text-[1.75rem] md:text-[2.4rem]">{title}</h1>
        <p className="mt-2 max-w-2xl text-[0.92rem] font-normal leading-6 text-muted">{description}</p>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
