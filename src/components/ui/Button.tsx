import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "md" | "lg";
}

const variantStyles: Record<string, string> = {
  primary:
    "bg-amber text-card hover:bg-amber-dark active:bg-amber-dark disabled:bg-sage disabled:text-card",
  secondary:
    "bg-transparent border border-pine text-pine hover:bg-sage-light disabled:border-line disabled:text-sage",
  ghost:
    "bg-transparent text-pine hover:bg-sage-light disabled:text-sage",
  danger:
    "bg-transparent border border-clay text-clay hover:bg-clay/10 disabled:border-line disabled:text-sage",
};

const sizeStyles: Record<string, string> = {
  md: "px-5 py-2.5 text-[15px]",
  lg: "px-7 py-3.5 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className = "", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`
          font-medium rounded-xl transition-colors duration-150
          disabled:cursor-not-allowed
          ${variantStyles[variant]} ${sizeStyles[size]} ${className}
        `}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
