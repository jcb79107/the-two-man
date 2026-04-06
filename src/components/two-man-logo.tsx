import Image from "next/image";
import { clsx } from "clsx";

interface TwoManLogoProps {
  className?: string;
  imageClassName?: string;
  priority?: boolean;
}

export function TwoManLogo({ className, imageClassName, priority = false }: TwoManLogoProps) {
  return (
    <div className={clsx("relative", className)}>
      <Image
        src="/two-man-logo.png"
        alt="The Two Man logo"
        fill
        priority={priority}
        className={clsx("object-contain", imageClassName)}
        sizes="(max-width: 768px) 160px, 220px"
      />
    </div>
  );
}
