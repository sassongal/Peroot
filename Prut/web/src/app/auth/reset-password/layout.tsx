import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "הגדרת סיסמה חדשה | Peroot",
  description:
    "הגדרת סיסמה חדשה לחשבון Peroot. בחרו סיסמה מאובטחת כדי להמשיך להשתמש בשירות שדרוג הפרומפטים.",
  robots: { index: false, follow: false },
};

export default function ResetPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
