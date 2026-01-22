/* eslint-disable @next/next/no-img-element */
import { AuthForm } from "@/components/auth/auth-form";

export default function LoginPage() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="min-h-screen bg-black text-silver font-sans relative overflow-hidden flex items-center justify-center p-4"
    >
      {/* Background Gradients */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-900/10 blur-[150px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-900/10 blur-[150px] rounded-full"></div>
        <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-20"></div>
      </div>

      <div className="relative z-10 w-full max-w-md animate-in fade-in zoom-in duration-500">
        <div className="glass-card p-8 rounded-2xl border-white/10 bg-black/40 shadow-2xl shadow-black/50">
           <div className="flex justify-center mb-8">
             <img src="/assets/branding/logo.svg" alt="Peroot" className="h-12 w-auto brightness-110 contrast-110" />
           </div>
           
           <AuthForm />
        </div>
      </div>
    </main>
  );
}
