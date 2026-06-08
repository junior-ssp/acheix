import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

type ButtonProps = ComponentPropsWithoutRef<"button"> & {
  children: ReactNode;
};

type LinkProps = ComponentPropsWithoutRef<typeof Link> & {
  children: ReactNode;
};

const baseClassName = "interactive-button";

export function InteractiveButton({ className = "", type = "button", ...props }: ButtonProps) {
  return <button type={type} className={`${baseClassName} ${className}`.trim()} {...props} />;
}

export function InteractiveLink({ className = "", ...props }: LinkProps) {
  return <Link className={`${baseClassName} ${className}`.trim()} {...props} />;
}
