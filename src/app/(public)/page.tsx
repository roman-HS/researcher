import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 p-8">
      <div className="max-w-lg space-y-3 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Researcher</h1>
        <p className="text-muted-foreground">
          Build, publish, and run deterministic real-estate investment
          workflows.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button asChild>
          <Link href="/sign-in">Sign in</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/workflows">Go to product</Link>
        </Button>
      </div>
    </main>
  );
}
