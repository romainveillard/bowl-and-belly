import type { ReactNode } from "react";

// Paths are taken from the UI design so the app matches it stroke for stroke.
interface IconProps {
  size?: number;
}

function Icon({ size = 22, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function TodayIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </Icon>
  );
}

export function HistoryIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </Icon>
  );
}

export function InsightsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 3v18h18" />
      <path d="M8 17v-5M13 17V8M18 17v-8" />
    </Icon>
  );
}

export function StockIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M21 8l-9-5-9 5 9 5 9-5z" />
      <path d="M3 8v8l9 5 9-5V8" />
      <path d="M12 13v8" />
    </Icon>
  );
}

export function PetsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="6" cy="10" r="2" />
      <circle cx="10" cy="5.5" r="2" />
      <circle cx="14" cy="5.5" r="2" />
      <circle cx="18" cy="10" r="2" />
      <path d="M8 17c0-2.5 1.8-5 4-5s4 2.5 4 5c0 1.7-1.3 2.5-2.5 2.5-.9 0-1-.5-1.5-.5s-.6.5-1.5.5C9.3 19.5 8 18.7 8 17z" />
    </Icon>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </Icon>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Icon>
  );
}

export function BackIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M15 18l-6-6 6-6" />
    </Icon>
  );
}

export function EditIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
    </Icon>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 9l6 6 6-6" />
    </Icon>
  );
}

export function CameraIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </Icon>
  );
}

export function AlertIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5" />
      <path d="M12 16h.01" />
    </Icon>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9 18l6-6-6-6" />
    </Icon>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M20 6L9 17l-5-5" />
    </Icon>
  );
}

export function BowlIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 11h18a9 7 0 0 1-18 0z" />
      <path d="M8 7c0-1.5 1-2 2-2M14 7c0-1.5 1-2 2-2" />
    </Icon>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </Icon>
  );
}

export function MinusIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 12h14" />
    </Icon>
  );
}

export function WetFoodIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3c3.5 4.2 6 7.4 6 10.5A6 6 0 0 1 6 13.5C6 10.4 8.5 7.2 12 3z" />
    </Icon>
  );
}

export function DryFoodIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="8" cy="9" r="2.6" />
      <circle cx="15.5" cy="8" r="2.6" />
      <circle cx="11.5" cy="15.5" r="2.6" />
    </Icon>
  );
}

export function RepeatIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M17 2l4 4-4 4" />
      <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
      <path d="M7 22l-4-4 4-4" />
      <path d="M21 13v1a4 4 0 0 1-4 4H3" />
    </Icon>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
    </Icon>
  );
}

export function LogoMark({ width = 44 }: { width?: number }) {
  return (
    <svg
      width={width}
      height={Math.round((width * 140) / 168)}
      viewBox="16 42 168 140"
      aria-hidden="true"
    >
      <rect
        x="44"
        y="52"
        width="11"
        height="42"
        rx="5.5"
        transform="rotate(-10 49 92)"
        fill="#4E5C7D"
      />
      <rect
        x="60"
        y="50"
        width="11"
        height="44"
        rx="5.5"
        transform="rotate(9 65 92)"
        fill="#4E5C7D"
      />
      <circle cx="58" cy="104" r="22" fill="#4E5C7D" />
      <circle cx="51" cy="102" r="3.5" fill="#FFC9A3" />
      <circle cx="65" cy="102" r="3.5" fill="#FFC9A3" />
      <circle cx="144" cy="104" r="24" fill="#34415F" />
      <ellipse cx="124" cy="104" rx="8" ry="16" transform="rotate(20 124 104)" fill="#2A3652" />
      <ellipse cx="164" cy="104" rx="8" ry="16" transform="rotate(-20 164 104)" fill="#2A3652" />
      <circle cx="137" cy="101" r="3.5" fill="#FFC9A3" />
      <circle cx="151" cy="101" r="3.5" fill="#FFC9A3" />
      <polygon
        points="78,84 82,58 98,72"
        fill="#1F2A44"
        stroke="#1F2A44"
        strokeWidth="8"
        strokeLinejoin="round"
      />
      <polygon
        points="122,84 118,58 102,72"
        fill="#1F2A44"
        stroke="#1F2A44"
        strokeWidth="8"
        strokeLinejoin="round"
      />
      <circle cx="100" cy="100" r="28" fill="#1F2A44" />
      <circle cx="91" cy="97" r="3.5" fill="#FFC9A3" />
      <circle cx="109" cy="97" r="3.5" fill="#FFC9A3" />
      <path d="M28 120 H172 Q168 176 100 176 Q32 176 28 120 Z" fill="#F08A4B" />
      <rect x="20" y="110" width="160" height="16" rx="8" fill="#CE7741" />
    </svg>
  );
}

export function LockIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </Icon>
  );
}

export function DownloadIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3v12" />
      <path d="M7 10l5 5 5-5" />
      <path d="M5 21h14" />
    </Icon>
  );
}

export function InfoIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 8h.01" />
    </Icon>
  );
}

export function RefreshIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M17 2l4 4-4 4" />
      <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
      <path d="M7 22l-4-4 4-4" />
      <path d="M21 13v1a4 4 0 0 1-4 4H3" />
    </Icon>
  );
}

export function CodeIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 6l-6 6 6 6" />
      <path d="M16 6l6 6-6 6" />
    </Icon>
  );
}

export function FlagIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 21V4" />
      <path d="M5 4h11l-2 4 2 4H5" />
    </Icon>
  );
}

export function HeartIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
    </Icon>
  );
}
