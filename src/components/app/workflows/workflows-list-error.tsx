import Link from "next/link";
import { AlertCircleIcon } from "lucide-react";

import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function WorkflowsListError() {
  return (
    <Alert variant="destructive" className="mt-6">
      <AlertCircleIcon />
      <AlertTitle>Could not load workflows</AlertTitle>
      <AlertDescription>
        Something went wrong while loading your workflows. Try again, or contact
        support if the problem continues.
      </AlertDescription>
      <AlertAction>
        <Button asChild variant="outline" size="sm">
          <Link href="/workflows">Try again</Link>
        </Button>
      </AlertAction>
    </Alert>
  );
}
