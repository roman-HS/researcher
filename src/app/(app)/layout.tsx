import Link from "next/link";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b">
        <nav className="mx-auto flex w-full max-w-5xl items-center gap-6 px-6 py-4 text-sm font-medium">
          <Link href="/workflows" className="text-foreground">
            Workflows
          </Link>
          <Link href="/runs" className="text-foreground">
            Runs
          </Link>
          <Link href="/settings" className="text-foreground">
            Settings
          </Link>
        </nav>
      </header>
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
