import React from "react";
import { cva, VariantProps } from "class-variance-authority";
import { twMerge } from "tailwind-merge";
const styles = cva(
  "inline-flex items-center justify-center gap-2 rounded-md font-semibold focus-visible:outline focus-visible:outline-2 disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-forest text-white",
        outline: "bg-white text-forest border border-solid border-[#cbd9cb]",
      },
      size: { sm: "text-xs px-3 py-2", md: "text-sm px-4 py-3" },
    },
    defaultVariants: { variant: "default", size: "md" },
  },
);
export function Button({
  variant,
  size,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof styles>) {
  return (
    <button
      className={twMerge(styles({ variant, size }), className)}
      {...props}
    />
  );
}
