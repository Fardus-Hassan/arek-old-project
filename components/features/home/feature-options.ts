import {
  Maximize,
  Image as ImageIcon,
  UserCircle2,
  Eraser,
  Users,
  Ruler,
  type LucideIcon,
} from "lucide-react";

export type FeatureOption = {
  id: string;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
};

export const FEATURE_OPTIONS: FeatureOption[] = [
  {
    id: "dimensions",
    label: "Physical Dimensions",
    shortLabel: "Dimensions",
    icon: Maximize,
  },
  {
    id: "try-on",
    label: "AI virtual try-on",
    shortLabel: "Try-on",
    icon: ImageIcon,
  },
  {
    id: "mannequin",
    label: "Mannequin",
    shortLabel: "Mannequin",
    icon: UserCircle2,
  },
  {
    id: "removal",
    label: "Background removal",
    shortLabel: "Removal",
    icon: Eraser,
  },
  { id: "model", label: "Model", shortLabel: "Model", icon: Users },
  {
    id: "diagram",
    label: "Image diagram",
    shortLabel: "Diagram",
    icon: Ruler,
  },
];

/** Pre-selected for every new group (excludes Image diagram). */
export const DEFAULT_GROUP_FEATURE_IDS = [
  "dimensions",
  "try-on",
  "mannequin",
  "removal",
  "model",
] as const;

export const DEFAULT_OUTPUT_LANGUAGE = "Polish" as const;
