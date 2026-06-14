import Link from "next/link";

import { EmptyState } from "@/components/app/empty-state";
import { Button } from "@/components/ui/button";

/**
 * @see Story 8.1.1 — Build workflow run form
 */

type WorkflowRunUnavailableProps = {
  workflowId: string;
  workflowName?: string;
  title: string;
  description: string;
};

export function WorkflowRunUnavailable({
  workflowId,
  workflowName,
  title,
  description,
}: WorkflowRunUnavailableProps) {
  return (
    <div className="mx-auto w-full max-w-2xl flex-1 p-4 md:p-6">
      <div className="mb-6">
        <p className="text-sm text-muted-foreground">
          <Link href="/workflows" className="hover:text-foreground">
            Workflows
          </Link>
          {workflowName ? (
            <>
              {" "}
              /{" "}
              <Link
                href={`/workflows/${workflowId}`}
                className="hover:text-foreground"
              >
                {workflowName}
              </Link>
            </>
          ) : null}
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Run workflow
        </h1>
      </div>

      <EmptyState
        title={title}
        description={description}
        action={
          <Button type="button" variant="outline" asChild>
            <Link href={`/workflows/${workflowId}`}>Back to builder</Link>
          </Button>
        }
      />
    </div>
  );
}
