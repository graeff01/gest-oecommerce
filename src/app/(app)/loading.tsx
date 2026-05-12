export default function AppLoading() {
  return (
    <div className="grid gap-4">
      <div className="skeleton h-20" />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="skeleton h-32" />
        ))}
      </div>
      <div className="grid gap-3 xl:grid-cols-[1.3fr_.7fr]">
        <div className="skeleton h-80" />
        <div className="skeleton h-80" />
      </div>
    </div>
  );
}
