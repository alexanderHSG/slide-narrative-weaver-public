export default function Badge({ label, value }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 bg-white shadow-sm text-xs md:text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-semibold">{value ?? 0}</span>
    </div>
  );
}
