export default function Logo() {
  return (
    <div
      className="pointer-events-none fixed left-16 top-4 z-50 flex items-center gap-2 drop-shadow-lg"
      aria-label="Oye Well"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-8 w-8 text-white"
      >
        <path d="M6 10h12a2 2 0 0 1 2 2v.5a6.5 6.5 0 0 1-13 0V12a2 2 0 0 1 2-2z" />
        <path d="M5 10l1-3h12l1 3" />
        <path d="M7 10v-2a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v2" />
        <path d="M8 21h8" />
      </svg>
      <span className="text-2xl font-black tracking-tight text-white">
        Oye <span className="font-light">Well</span>
      </span>
    </div>
  );
}
