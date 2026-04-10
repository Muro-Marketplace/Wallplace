"use client";

export default function ScrollButton({
  targetId,
  label = "Scroll to explore",
  inline = false,
}: {
  targetId: string;
  label?: string;
  inline?: boolean;
}) {
  return (
    <button
      onClick={() =>
        document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth" })
      }
      className={`${inline ? "relative" : "absolute bottom-10 left-1/2 -translate-x-1/2"} z-10 flex flex-col items-center gap-2 text-white/50 hover:text-white transition-colors duration-300 cursor-pointer`}
    >
      <span className="text-xs tracking-[0.2em] uppercase font-medium">
        {label}
      </span>
      <div className="w-8 h-8 rounded-full border border-white/25 flex items-center justify-center animate-bounce">
        <svg
          width="14"
          height="14"
          viewBox="0 0 18 18"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 7l5 5 5-5" />
        </svg>
      </div>
    </button>
  );
}
