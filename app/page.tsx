"use client";
import { useRouter } from "next/navigation";

export default function Landing() {
  const router = useRouter();

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#FBFAFD]">
      {/* ── ambient background ─────────────────────────────── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* soft wash */}
        <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_85%_0%,#F2EFFCcc_0%,transparent_55%),radial-gradient(90%_80%_at_0%_85%,#EAF0FEcc_0%,transparent_55%)]" />

        {/* top-right orb */}
        <div className="absolute -right-24 -top-32 h-[26rem] w-[26rem] rounded-full bg-gradient-to-br from-[#E9E4FB] to-[#F6F2FE] opacity-80" />
        <DotGrid className="absolute right-24 top-24 text-[#C9C2E8]/50" />

        {/* bottom-left orb */}
        <div className="absolute -bottom-40 -left-32 h-[30rem] w-[30rem] rounded-full bg-gradient-to-tr from-[#DDE6FB] to-[#EFE9FB] opacity-70" />
        <DotGrid className="absolute bottom-24 left-24 text-[#BFC9E8]/50" />

        {/* flowing line */}
        <svg
          className="absolute inset-x-0 bottom-[28%] w-full"
          viewBox="0 0 1440 220"
          fill="none"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="flow" x1="0" y1="0" x2="1440" y2="0" gradientUnits="userSpaceOnUse">
              <stop stopColor="#7FA6F5" stopOpacity="0.55" />
              <stop offset="0.55" stopColor="#B49BEE" stopOpacity="0.7" />
              <stop offset="1" stopColor="#E7A7DC" stopOpacity="0.55" />
            </linearGradient>
          </defs>
          <path
            d="M-40 168 C 240 168, 300 150, 520 128 S 900 96, 1080 52 S 1360 6, 1480 2"
            stroke="url(#flow)"
            strokeWidth="1.5"
            fill="none"
          />
          <circle cx="1152" cy="38" r="4.5" fill="#B49BEE" />
          <circle cx="1152" cy="38" r="11" fill="#B49BEE" opacity="0.18" />
        </svg>
      </div>

      {/* ── logo ───────────────────────────────────────────── */}
      <header className="relative z-10 px-8 pt-8 sm:px-14 sm:pt-10">
        <div className="flex items-center gap-3">
          <svg width="30" height="30" viewBox="0 0 30 30" fill="none" aria-hidden="true">
            <rect x="2" y="17" width="6.5" height="11" rx="3.25" fill="#8B5CF6" />
            <rect x="11.75" y="10" width="6.5" height="18" rx="3.25" fill="#6366F1" />
            <rect x="21.5" y="3" width="6.5" height="25" rx="3.25" fill="#4F46E5" />
          </svg>
          <span className="text-[26px] font-bold tracking-[-0.02em] text-[#12142B]">AdLens</span>
        </div>
      </header>

      {/* ── hero ───────────────────────────────────────────── */}
      <main className="relative z-10 flex min-h-[calc(100vh-6.5rem)] flex-col justify-center px-8 sm:px-14">
        <h1 className="max-w-4xl text-[clamp(2.6rem,7vw,5.1rem)] font-bold leading-[1.06] tracking-[-0.035em]">
          <span className="block text-[#12142B]">Find What&rsquo;s Failing.</span>
          <span className="block bg-gradient-to-r from-[#2B4FF0] via-[#5B45E8] to-[#9B3FD8] bg-clip-text text-transparent">
            Scale What&rsquo;s Winning.
          </span>
        </h1>

        <p className="mt-8 max-w-xl text-[clamp(1rem,1.35vw,1.15rem)] leading-[1.75] text-[#5B6070]">
          AdLens helps you analyze your advertising performance across campaigns
          and gives you AI-powered insights that drive better results.
        </p>
      </main>

      {/* ── CTA ────────────────────────────────────────────── */}
      <div className="relative z-10 flex justify-end px-8 pb-12 sm:px-14 sm:pb-16">
        <button
          onClick={() => router.push("/check")}
          className="group inline-flex items-center gap-5 rounded-2xl bg-gradient-to-r from-[#2F4BF0] to-[#8B3FE0] px-11 py-5 text-[1.15rem] font-medium text-white shadow-[0_18px_38px_-12px_rgba(83,63,224,0.55)] transition-all hover:shadow-[0_22px_46px_-12px_rgba(83,63,224,0.65)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6D5AE6] focus-visible:ring-offset-2"
        >
          Get Started
          <svg width="22" height="16" viewBox="0 0 22 16" fill="none" aria-hidden="true">
            <path
              d="M1 8h19m0 0l-6.5-6.5M20 8l-6.5 6.5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

function DotGrid({ className = "" }: { className?: string }) {
  return (
    <svg width="86" height="86" viewBox="0 0 86 86" fill="none" className={className} aria-hidden="true">
      {Array.from({ length: 7 }).map((_, r) =>
        Array.from({ length: 7 }).map((_, c) => (
          <circle key={`${r}-${c}`} cx={5 + c * 12.5} cy={5 + r * 12.5} r="1.6" fill="currentColor" />
        ))
      )}
    </svg>
  );
}
