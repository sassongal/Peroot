import Image from "next/image";
import { AuthForm } from "@/components/auth/auth-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "התחברות",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="min-h-screen bg-[#050505] font-sans relative overflow-hidden flex items-center justify-center px-4 py-12"
    >
      {/* Layered background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-amber-500/[0.06] blur-[160px] rounded-full" />
        <div className="absolute bottom-[-15%] right-[-5%] w-[400px] h-[400px] bg-orange-600/[0.04] blur-[120px] rounded-full" />
        <div className="absolute top-[40%] left-[-10%] w-[300px] h-[300px] bg-slate-500/[0.03] blur-[100px] rounded-full" />
        <div className="absolute inset-0 opacity-[0.035]" style={{ backgroundImage: "url('/noise.svg')" }} />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />
      </div>

      <div className="relative z-10 w-full max-w-[420px]">
        {/* Hero image */}
        <div className="flex justify-center mb-6 relative">
          <div className="absolute inset-0 flex justify-center items-center">
            <div className="w-48 h-32 bg-amber-500/[0.1] blur-[60px] rounded-full" />
          </div>
          <Image
            src="/images/peroot_logo_pack/peroot_og_image_v3.webp"
            alt="Peroot — מחולל פרומפטים מקצועיים בעברית"
            width={360}
            height={189}
            className="relative rounded-xl w-full max-w-[360px] h-auto drop-shadow-[0_4px_30px_rgba(217,119,6,0.12)]"
            priority
          />
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.05] to-white/[0.02] backdrop-blur-2xl p-7 shadow-[0_16px_80px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.05)] animate-in fade-in slide-in-from-bottom-3 duration-700">
          <AuthForm />
        </div>

        {/* Footer trust line */}
        <p className="text-center text-[11px] text-white/15 mt-6 tracking-wide">
          המידע שלך מאובטח ומוגן
        </p>
      </div>
    </main>
  );
}
