import { PublicNavBar } from "@/components/layout/PublicNavBar";

/**
 * (public) route group — every marketing/content/docs page gets the branded
 * top bar by construction (the group does not affect URLs). The global Footer
 * already comes from the root layout. Gate pages (login, /oauth/authorize)
 * and the app itself stay outside on purpose — they have their own chrome.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PublicNavBar />
      {children}
    </>
  );
}
