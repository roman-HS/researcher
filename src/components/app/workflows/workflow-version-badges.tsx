import { Badge } from "@/components/ui/badge";
import type { WorkflowListItem } from "@/contracts/workflows/responses";

type WorkflowVersionBadgesProps = {
  draftVersion: WorkflowListItem["draftVersion"];
  publishedVersion: WorkflowListItem["publishedVersion"];
};

export function WorkflowVersionBadges({
  draftVersion,
  publishedVersion,
}: WorkflowVersionBadgesProps) {
  if (!draftVersion && !publishedVersion) {
    return (
      <Badge variant="outline" className="whitespace-nowrap">
        No version
      </Badge>
    );
  }

  return (
    <div className="flex flex-wrap gap-1">
      {draftVersion ? (
        <Badge variant="secondary" className="whitespace-nowrap">
          Draft v{draftVersion.versionNumber}
        </Badge>
      ) : null}
      {publishedVersion ? (
        <Badge variant="default" className="whitespace-nowrap">
          Published v{publishedVersion.versionNumber}
        </Badge>
      ) : null}
    </div>
  );
}
