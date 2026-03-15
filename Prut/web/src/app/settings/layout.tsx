import { Metadata } from "next";

export const metadata: Metadata = {
  title: "הגדרות | פירוט - Peroot",
  robots: { index: false, follow: false },
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
