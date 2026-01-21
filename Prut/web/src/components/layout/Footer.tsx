export function Footer() {
  return (
    <footer className="border-t py-6 md:py-0">
      <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row px-4 sm:px-8">
        <p className="text-center text-sm leading-loose text-muted-foreground md:text-right">
          נבנה על ידי{" "}
          <a
            href="https://twitter.com/shadcn"
            target="_blank"
            rel="noreferrer"
            className="font-medium underline underline-offset-4"
          >
            Peirutech
          </a>
          . כל הזכויות שמורות.
        </p>
      </div>
    </footer>
  );
}
