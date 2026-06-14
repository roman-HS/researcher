import Link from "next/link";

import { Button } from "@/components/ui/button";

type WorkflowBuilderPageProps = {
  params: Promise<{ workflowId: string }>;
};

export default async function WorkflowBuilderPage({
  params,
}: WorkflowBuilderPageProps) {
  const { workflowId } = await params;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Workflow builder
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            The visual builder for workflow {workflowId} will be added in a later
            story.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/workflows">Back to workflows</Link>
        </Button>
      </div>
    </div>
  );
}
