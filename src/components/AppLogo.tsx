const LOGO_SRC = "/logo.png";

interface AppLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const SIZES = {
  sm: "w-8 h-8",
  md: "w-10 h-10",
  lg: "w-14 h-14",
  xl: "w-20 h-20",
};

export default function AppLogo({ size = "md", className = "" }: AppLogoProps) {
  return (
    <img
      src={LOGO_SRC}
      alt="Pagadian Capitol College Central Student Government"
      className={`${SIZES[size]} rounded-full object-cover bg-white flex-shrink-0 ${className}`}
    />
  );
}
