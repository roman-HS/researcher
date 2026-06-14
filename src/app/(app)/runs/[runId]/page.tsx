import { notFound } from "next/navigation";

import { domainEntityIdSchema } from "@/contracts/domain/primitives";

type RunDetailPageProps = {
  params: Promise<{ runId: string }>;
};

export default async function RunDetailPage({ params }: RunDetailPageProps) {
  const { runId } = await params;
  const parsedRunId = domainEntityIdSchema.safeParse(runId);

  if (!parsedRunId.success) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 p-4 md:p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Run detail</h1>
      <p className="mt-2 text-muted-foreground">
        Run <span className="font-mono text-sm">{parsedRunId.data}</span> was
        created successfully. Full run detail views will be added in later
        stories.
      </p>
    </div>
  );
}
