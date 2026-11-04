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
