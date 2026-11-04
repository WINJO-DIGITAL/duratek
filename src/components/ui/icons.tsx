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
