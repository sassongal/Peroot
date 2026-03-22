/**
 * HomeShell — server-rendered visual shell for instant LCP.
 *
 * Paints the above-the-fold layout (nav, hero, button, input skeleton)
 * from the first byte of HTML, before any JS executes.
 * HomeClient hydrates on top and removes this shell via useEffect.
 */
export function HomeShell() {
  return (
    <div
      id="home-shell"
      aria-hidden="true"
      className="relative z-0"
      dir="rtl"
    >
      {/* Nav placeholder — matches TopNavBar exactly */}
      <nav
        className="sticky top-0 z-50 w-full backdrop-blur-xl"
        style={{
          background: "var(--surface-nav)",
          borderBottom: "1px solid var(--border-nav)",
        }}
      >
        <div className="flex items-center justify-between h-14 px-4 sm:px-6 max-w-[1920px] mx-auto" />
      </nav>

      {/* Main content area — matches HomeClient wrapper + inner layout */}
      <div className="relative min-h-[calc(100vh-1rem)] flex flex-col items-center p-4 bg-[var(--surface-body)] text-[var(--text-primary)] font-sans pb-10 pt-2 px-4 md:px-6 max-w-[100vw] overflow-x-hidden">
        <div className="flex flex-col gap-6 max-w-[1920px] 2xl:max-w-7xl mx-auto w-full pb-20 md:pb-0">
          {/* Background Gradient */}
          <div className="absolute top-0 inset-x-0 h-40 bg-linear-to-b from-amber-500/[0.12] dark:from-amber-500/8 via-red-500/[0.04] dark:via-yellow-500/4 to-transparent blur-3xl -z-10" />

          <div className="flex flex-col gap-4 md:gap-6 max-w-4xl mx-auto w-full px-4 md:px-8 pt-4">
            {/* Hero logo with animated rings — uses same CSS classes from globals.css */}
            <div className="flex justify-center">
              <div className="hero-logo-container">
                <div className="hero-logo-ring hero-logo-ring-1" />
                <div className="hero-logo-ring hero-logo-ring-2" />
                <div className="hero-logo-ring hero-logo-ring-3" />
                {/* Plain <img> for fastest LCP — no next/image overhead in shell */}
                <img
                  src="/Peroot-hero.png"
                  alt=""
                  className="hero-logo-image"
                  width={720}
                  height={392}
                  fetchPriority="high"
                  decoding="async"
                />
              </div>
            </div>

            {/* "מה עושים פה?" button placeholder */}
            <div className="flex items-center justify-center -mt-3 md:-mt-2 min-h-[32px] md:min-h-[44px]">
              <span className="text-xs md:text-sm text-[var(--text-muted)]">
                מה עושים פה?
              </span>
            </div>

            {/* Input skeleton — approximates PromptInput + capability bar */}
            <div className="flex flex-col gap-3">
              <div className="rounded-2xl bg-[var(--glass-bg)] border border-[var(--glass-border)] h-[140px] md:h-[160px]" />
              <div className="flex gap-2 justify-center">
                <div className="rounded-full bg-[var(--glass-bg)] h-9 w-20" />
                <div className="rounded-full bg-[var(--glass-bg)] h-9 w-20" />
                <div className="rounded-full bg-[var(--glass-bg)] h-9 w-20" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
