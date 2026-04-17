import { clsx } from './utils';

export function Th({ children, className }) {
  return (
    <th className={clsx('text-left px-4 py-3 border-b text-[13px] font-semibold text-neutral-700', className)}>
      {children}
    </th>
  );
}

export function Td({ children, className }) {
  return <td className={clsx('px-4 py-3 border-b align-middle', className)}>{children}</td>;
}

export function SkeletonRows({ rows = 6, columns = 3 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="odd:bg-white even:bg-neutral-50">
          {Array.from({ length: columns }).map((_, j) => (
            <td key={j} className="px-4 py-3 border-b">
              <div className="h-3 rounded bg-neutral-200 animate-pulse" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
