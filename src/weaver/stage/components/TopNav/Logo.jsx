const Logo = () => (
  <div className="flex items-center space-x-2">
    <h1 className="text-4xl font-extrabold">
      <span className="bg-gradient-to-r from-green-600 via-green-700 to-green-900 bg-clip-text text-transparent animate-gradient-x">
        InspiraGraph
      </span>
    </h1>
    <svg
      className="w-8 h-8 text-green-700"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <circle cx="6" cy="12" r="2" fill="currentColor" />
      <circle cx="18" cy="6" r="2" fill="currentColor" />
      <circle cx="18" cy="18" r="2" fill="currentColor" />
      <path d="M8 12L16 7" />
      <path d="M8 12L16 17" />
    </svg>
  </div>
);

export default Logo;
