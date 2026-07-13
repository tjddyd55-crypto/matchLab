import type { LucideIcon } from "lucide-react";
import {
  ClipboardCheck,
  FileText,
  Files,
  Gavel,
  GitBranch,
  Globe,
  Home,
  Layers,
  Link2,
  ListOrdered,
  MapPin,
  QrCode,
  Radio,
  Settings,
  Swords,
  Trophy,
  Users,
  Wallet,
} from "lucide-react";
import type { EventManagementNavIconKey } from "@/lib/ui/event-management-navigation";

export const EVENT_MANAGEMENT_NAV_ICONS: Record<
  EventManagementNavIconKey,
  LucideIcon
> = {
  home: Home,
  settings: Settings,
  layers: Layers,
  "file-text": FileText,
  wallet: Wallet,
  users: Users,
  "clipboard-check": ClipboardCheck,
  "git-branch": GitBranch,
  "list-ordered": ListOrdered,
  swords: Swords,
  "map-pin": MapPin,
  gavel: Gavel,
  "qr-code": QrCode,
  trophy: Trophy,
  link: Link2,
  globe: Globe,
  files: Files,
  radio: Radio,
};
