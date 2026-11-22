import type { ReactNode } from "react";

// Paths are taken from the UI design so the app matches it stroke for stroke.
function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      width="22"
      height="22"
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

export function TodayIcon() {
  return (
    <Icon>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </Icon>
  );
}

export function HistoryIcon() {
  return (
    <Icon>
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </Icon>
  );
}

export function InsightsIcon() {
  return (
    <Icon>
      <path d="M3 3v18h18" />
      <path d="M8 17v-5M13 17V8M18 17v-8" />
    </Icon>
  );
}

export function StockIcon() {
  return (
    <Icon>
      <path d="M21 8l-9-5-9 5 9 5 9-5z" />
      <path d="M3 8v8l9 5 9-5V8" />
      <path d="M12 13v8" />
    </Icon>
  );
}

export function PetsIcon() {
  return (
    <Icon>
      <circle cx="6" cy="10" r="2" />
      <circle cx="10" cy="5.5" r="2" />
      <circle cx="14" cy="5.5" r="2" />
      <circle cx="18" cy="10" r="2" />
      <path d="M8 17c0-2.5 1.8-5 4-5s4 2.5 4 5c0 1.7-1.3 2.5-2.5 2.5-.9 0-1-.5-1.5-.5s-.6.5-1.5.5C9.3 19.5 8 18.7 8 17z" />
    </Icon>
  );
}
