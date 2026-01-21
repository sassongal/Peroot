import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between px-4 sm:px-8">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl">
          <span>Peroot</span>
          <span className="text-primary hidden sm:inline-block">| פירוט</span>
        </Link>
        
        <nav className="flex items-center gap-4">
            {/* Placeholder for Auth */}
            <Button variant="ghost" size="sm">
              התחבר
            </Button>
            <Button size="sm">
              הרשם
            </Button>
        </nav>
      </div>
    </header>
  );
}
