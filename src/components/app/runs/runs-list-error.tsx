import Link from "next/link";
import { AlertCircleIcon } from "lucide-react";

import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

/**
 * @see Story 8.2.1 — Build runs list page
 */

export function RunsListError() {
  return (
    <Alert variant="destructive" className="mt-6">
      <AlertCircleIcon />
      <AlertTitle>Could not load runs</AlertTitle>
      <AlertDescription>
        Something went wrong while loading your run history. Try again, or
        contact support if the problem continues.
      </AlertDescription>
      <AlertAction>
        <Button asChild variant="outline" size="sm">
          <Link href="/runs">Try again</Link>
        </Button>
      </AlertAction>
    </Alert>
  );
}
