import clsx from "clsx";

export default function MetaChip({
  icon: Icon,
  text,
  title,
  className,
  maxWidth = "max-w-[10rem]",
}) {
  if (!text) return null;
  return (
    <span
      title={title || text}
      className={clsx(
        "inline-flex h-7 items-center gap-1.5 rounded-full border border-slate-200",
        "bg-slate-50 px-2.5 text-xs font-medium text-slate-700 leading-none",
        "whitespace-nowrap transition-colors hover:bg-slate-100",
        className
      )}
    >
      {Icon ? <Icon className="h-3.5 w-3.5 text-slate-500" aria-hidden /> : null}
      <span className={clsx("truncate", maxWidth)}>{text}</span>
    </span>
  );
}
