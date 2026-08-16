import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function IconBase({ children, ...props }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      focusable="false"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      {...props}
    >
      {children}
    </svg>
  );
}

export function MenuIcon(props: IconProps) {
  return <IconBase {...props}><path d="M4 7h16M4 12h16M4 17h16" /></IconBase>;
}

export function CloseIcon(props: IconProps) {
  return <IconBase {...props}><path d="m6 6 12 12M18 6 6 18" /></IconBase>;
}

export function PlusIcon(props: IconProps) {
  return <IconBase {...props}><path d="M12 5v14M5 12h14" /></IconBase>;
}

export function HistoryIcon(props: IconProps) {
  return <IconBase {...props}><path d="M8 6.5h10M8 11.5h10M8 16.5h6" /><path d="M4 6.5h.01M4 11.5h.01M4 16.5h.01" /></IconBase>;
}

export function SettingsIcon(props: IconProps) {
  return <IconBase {...props}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21h-4v-.08A1.7 1.7 0 0 0 8.96 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.53-1H3v-4h.08A1.7 1.7 0 0 0 4.6 8.96a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10 3.08V3h4v.08A1.7 1.7 0 0 0 15.04 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.17.62.79 1 1.53 1H21v4h-.08c-.73 0-1.35.38-1.52 1Z" /></IconBase>;
}

export function SunIcon(props: IconProps) {
  return <IconBase {...props}><circle cx="12" cy="12" r="3.5" /><path d="M12 2.5v2M12 19.5v2M4.5 12h-2M21.5 12h-2M5.3 5.3 3.9 3.9M20.1 20.1l-1.4-1.4M18.7 5.3l1.4-1.4M3.9 20.1l1.4-1.4" /></IconBase>;
}

export function MoonIcon(props: IconProps) {
  return <IconBase {...props}><path d="M20.5 15.2A8 8 0 0 1 8.8 3.5 8.2 8.2 0 1 0 20.5 15.2Z" /></IconBase>;
}

export function PaperclipIcon(props: IconProps) {
  return <IconBase {...props}><path d="m9.5 12.5 5.7-5.7a3 3 0 1 1 4.2 4.2l-8.5 8.5a5 5 0 0 1-7.1-7.1l8.1-8.1a3.5 3.5 0 0 1 5 5l-8.2 8.2a2 2 0 0 1-2.8-2.8l7.5-7.5" /></IconBase>;
}

export function PaletteIcon(props: IconProps) {
  return <IconBase {...props}><path d="M12 3a9 9 0 0 0 0 18h1.5a1.8 1.8 0 0 0 0-3.6h-.7a1.5 1.5 0 0 1 0-3H16A5 5 0 0 0 21 9.5C21 5.9 17 3 12 3Z" /><circle cx="7.5" cy="10" r=".7" fill="currentColor" stroke="none" /><circle cx="10" cy="6.8" r=".7" fill="currentColor" stroke="none" /><circle cx="14" cy="6.5" r=".7" fill="currentColor" stroke="none" /><circle cx="17.2" cy="9" r=".7" fill="currentColor" stroke="none" /></IconBase>;
}

export function ArrowUpIcon(props: IconProps) {
  return <IconBase {...props}><path d="m6.5 10 5.5-5.5 5.5 5.5M12 4.5v15" /></IconBase>;
}

export function BlueprintIcon(props: IconProps) {
  return <IconBase {...props}><path d="M4 4h16v16H4zM4 9h6V4M14 20v-6h6M10 9v5h4V9" /></IconBase>;
}

export function LockIcon(props: IconProps) {
  return <IconBase {...props}><rect x="5.5" y="10" width="13" height="10" rx="2" /><path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10" /></IconBase>;
}
