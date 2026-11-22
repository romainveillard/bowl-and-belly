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

export function LogoMark() {
  return (
    <svg width="44" height="36" viewBox="16 42 168 140" aria-hidden="true">
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
