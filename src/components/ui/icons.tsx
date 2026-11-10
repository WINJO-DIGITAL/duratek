import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 20, children, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="square"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export const ArrowRight = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 12h15M14 6.5l5.5 5.5-5.5 5.5" />
  </Icon>
);
export const ArrowLeft = (p: IconProps) => (
  <Icon {...p}>
    <path d="M20 12H5M10 6.5 4.5 12l5.5 5.5" />
  </Icon>
);
export const Search = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="10.5" cy="10.5" r="6" />
    <path d="m15 15 5 5" />
  </Icon>
);
export const Menu = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3.5 7h17M3.5 12h17M3.5 17h17" />
  </Icon>
);
export const Close = (p: IconProps) => (
  <Icon {...p}>
    <path d="m5.5 5.5 13 13M18.5 5.5l-13 13" />
  </Icon>
);
export const Check = (p: IconProps) => (
  <Icon {...p}>
    <path d="m4.5 12.5 5 5 10-11" />
  </Icon>
);
/** Range: a plank layout. */
export const Planks = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3.5 5h17v14h-17zM3.5 9.7h17M3.5 14.3h17M11 5v4.7M7 9.7v4.6M15 14.3V19" />
  </Icon>
);
/** Samples: stacked swatches. */
export const Swatches = (p: IconProps) => (
  <Icon {...p}>
    <path d="M7 4h12v12H7z" />
    <path d="M4.5 7.5V19.5h12" />
  </Icon>
);
export const Pin = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 21s-6.5-6.2-6.5-11.2a6.5 6.5 0 0 1 13 0C18.5 14.8 12 21 12 21z" />
    <circle cx="12" cy="9.8" r="2.3" />
  </Icon>
);
export const Briefcase = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3.5 8h17v11h-17zM9 8V5h6v3M3.5 13h17" />
  </Icon>
);

/* Social: drawn in the same 1.5px line style as the rest of the set. */
export const Facebook = (p: IconProps) => (
  <Icon {...p} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
    <path d="M15.5 8.5h-1.5a2 2 0 0 0-2 2v10M9.5 13h6" />
  </Icon>
);
export const Instagram = (p: IconProps) => (
  <Icon {...p} strokeLinecap="round">
    <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
    <circle cx="12" cy="12" r="3.75" />
    <circle cx="17" cy="7" r="0.5" fill="currentColor" />
  </Icon>
);
export const Pinterest = (p: IconProps) => (
  <Icon {...p} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="8.5" />
    <path d="M10.6 20.2 12.4 13M10.4 14.6c.5.9 1.4 1.4 2.5 1.4 2.3 0 3.8-2 3.8-4.6 0-2.6-2.1-4.4-4.7-4.4-2.9 0-4.8 2-4.8 4.5 0 1 .4 2 1.1 2.4" />
  </Icon>
);
export const LinkedIn = (p: IconProps) => (
  <Icon {...p} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
    <path d="M8 10.5v6M8 7.5v.01M11.5 16.5v-6M11.5 13a2.5 2.5 0 0 1 5 0v3.5" />
  </Icon>
);
export const YouTube = (p: IconProps) => (
  <Icon {...p} strokeLinecap="round" strokeLinejoin="round">
    <rect x="2.5" y="5.5" width="19" height="13" rx="4" />
    <path d="m10 9.5 4.5 2.5-4.5 2.5z" />
  </Icon>
);
export const ArrowUpRight = (p: IconProps) => (
  <Icon {...p}>
    <path d="M7 17 17 7M9 7h8v8" />
  </Icon>
);
export const Phone = (p: IconProps) => (
  <Icon {...p} strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 4.5h3.2l1.6 4-2 1.3a10 10 0 0 0 6.4 6.4l1.3-2 4 1.6V19a1.5 1.5 0 0 1-1.6 1.5A15.5 15.5 0 0 1 3.5 6.1 1.5 1.5 0 0 1 5 4.5z" />
  </Icon>
);
export const Bookmark = ({ filled = false, ...p }: IconProps & { filled?: boolean }) => (
  <Icon {...p}>
    <path d="M6.5 3.5h11v17l-5.5-4-5.5 4z" fill={filled ? "currentColor" : "none"} />
  </Icon>
);
/* Product facts. Simple line drawings in the same 1.5px stroke. */
export const LayersIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 4 3.5 8.5 12 13l8.5-4.5z" />
    <path d="m3.5 12.5 8.5 4.5 8.5-4.5M3.5 16.5 12 21l8.5-4.5" />
  </Icon>
);
export const ShieldIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3.5 5 6v5.5c0 4.2 2.9 7.6 7 9 4.1-1.4 7-4.8 7-9V6z" />
    <path d="m9 12 2.2 2.2L15.5 10" />
  </Icon>
);
export const DropIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3.5s-6 6.6-6 10.9a6 6 0 0 0 12 0C18 10.1 12 3.5 12 3.5z" />
    <path d="M9 14.5a3 3 0 0 0 3 3" />
  </Icon>
);
export const ClickIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 9.5h8v2.5h2.5V9.5H21M3 14.5h6.5V12H13v2.5h8" />
  </Icon>
);
export const UnderlayIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 9h18M3 13h18" />
    <path d="M4 17c1.3-1 2.7-1 4 0s2.7 1 4 0 2.7-1 4 0 2.7 1 4 0" />
  </Icon>
);
export const TagIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3.5 12.5V4h8.5l8.5 8.5-8.5 8.5z" />
    <circle cx="8" cy="8.5" r="1.2" />
  </Icon>
);
/** A quotation: a sheet with lines and a total. */
export const QuoteIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5.5 3.5h13v17h-13z" />
    <path d="M8.5 8h7M8.5 11.5h7M8.5 16.5h3M14 16.5h1.5" />
  </Icon>
);
/** A calculator: a body, a display and keys. */
export const CalculatorIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 3.5h12v17H6z" />
    <path d="M8.5 6.5h7v3h-7zM9 13h.01M12 13h.01M15 13h.01M9 16.5h.01M12 16.5h.01M15 16.5h.01" />
  </Icon>
);
export const DocumentIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 3.5h8l4 4V20.5H6z" />
    <path d="M13.5 3.5V8H18M9 12h6M9 15.5h6" />
  </Icon>
);
export const ShareIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="6.5" cy="12" r="2.2" />
    <circle cx="17.5" cy="6" r="2.2" />
    <circle cx="17.5" cy="18" r="2.2" />
    <path d="m8.5 11 7-4M8.5 13l7 4" />
  </Icon>
);
export const EyeIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
    <circle cx="12" cy="12" r="2.8" />
  </Icon>
);
export const ParcelIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3.5 20 7.5v9L12 20.5 4 16.5v-9z" />
    <path d="m4 7.5 8 4 8-4M12 11.5v9" />
  </Icon>
);
