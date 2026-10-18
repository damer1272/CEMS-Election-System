import { useState } from "react";
import { getInitials } from "../data/store";

interface AvatarProps {
  src?: string;
  name: string;
  className?: string;
  fallbackClassName?: string;
}

export default function Avatar({
  src,
  name,
  className = "w-10 h-10 rounded-full",
  fallbackClassName = "bg-[#233C4B]/10 text-[#233C4B]",
}: AvatarProps) {
  const [imgError, setImgError] = useState(false);

  const cleanSrc = src?.trim();
  const showImg = Boolean(cleanSrc && !imgError && !cleanSrc.includes("pravatar.cc"));

  if (showImg) {
    return (
      <img
        src={cleanSrc}
        alt={name}
        onError={() => setImgError(true)}
        className={`${className} object-cover flex-shrink-0`}
      />
    );
  }

  return (
    <div
      className={`${className} ${fallbackClassName} font-bold flex items-center justify-center flex-shrink-0 select-none text-xs`}
    >
      {getInitials(name) || "•"}
    </div>
  );
}
