import {
  BuildingIcon,
  CalculatorIcon,
  DollarSignIcon,
  FileTextIcon,
  GitCompareIcon,
  MapPinIcon,
  SearchIcon,
  StarIcon,
  WrenchIcon,
  type LucideIcon,
} from "lucide-react";

import type { ToolIconKey } from "@/contracts/tools/internal";

/**
 * Maps registry `iconKey` values to Lucide icons for builder UI.
 *
 * @see Story 5.3.1 — Build tool palette
 */

const toolIconByKey: Record<ToolIconKey, LucideIcon> = {
  search: SearchIcon,
  building: BuildingIcon,
  gitCompare: GitCompareIcon,
  dollarSign: DollarSignIcon,
  calculator: CalculatorIcon,
  star: StarIcon,
  mapPin: MapPinIcon,
  fileText: FileTextIcon,
};

type ToolIconProps = {
  iconKey: ToolIconKey;
  className?: string;
};

export function ToolIcon({ iconKey, className }: ToolIconProps) {
  const Icon = toolIconByKey[iconKey] ?? WrenchIcon;

  return <Icon className={className} aria-hidden />;
}
