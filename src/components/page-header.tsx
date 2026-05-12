export function PageHeader({
  title,
  description,
  action,
  eyebrow = "Ateliê Commerce"
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="eyebrow mb-3">{eyebrow}</p>
        <h1 className="heading-display text-[2rem] md:text-[2.4rem]">{title}</h1>
        <p className="mt-2 max-w-2xl text-[0.92rem] font-normal leading-6 text-muted">{description}</p>
      </div>
      {action}
    </div>
  );
}
