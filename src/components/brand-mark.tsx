import Image from "next/image";

type BrandMarkProps = {
  className?: string;
  priority?: boolean;
  size?: number;
  variant?: "default" | "light" | "dark";
};

const sources = {
  default: "/brand/uai-flow-icon.png",
  light: "/brand/uai-flow-icon-light.png",
  dark: "/brand/uai-flow-icon-dark.png",
};

export function BrandMark({ className = "", priority = false, size = 32, variant = "default" }: BrandMarkProps) {
  return (
    <Image
      alt=""
      aria-hidden="true"
      className={className}
      height={size}
      priority={priority}
      src={sources[variant]}
      width={size}
    />
  );
}
