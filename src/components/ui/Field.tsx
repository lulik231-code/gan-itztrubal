import { InputHTMLAttributes, TextareaHTMLAttributes, ReactNode, forwardRef } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-card border border-line rounded-2xl shadow-[0_2px_12px_rgba(28,43,30,0.06)] ${className}`}>
      {children}
    </div>
  );
}

interface FieldProps {
  label: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
}

export function Field({ label, required, error, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-pine-dark">
        {label}
        {required && <span className="text-clay mr-1"> *</span>}
      </label>
      {children}
      {error && <p className="text-sm text-clay">{error}</p>}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className = "", ...props }, ref) => (
    <input
      ref={ref}
      className={`
        w-full rounded-lg border border-line bg-card px-4 py-2.5 text-pine-dark
        placeholder:text-pine-dark/40
        focus:border-amber focus:outline-none
        disabled:bg-sage-light disabled:text-pine-dark/50
        ${className}
      `}
      {...props}
    />
  )
);
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className = "", ...props }, ref) => (
    <textarea
      ref={ref}
      className={`
        w-full rounded-lg border border-line bg-card px-4 py-2.5 text-pine-dark
        placeholder:text-pine-dark/40
        focus:border-amber focus:outline-none
        min-h-[90px] resize-y
        ${className}
      `}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";

interface CheckboxRowProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  required?: boolean;
  children: ReactNode;
  error?: boolean;
}

export function CheckboxRow({ id, checked, onChange, required, children, error }: CheckboxRowProps) {
  return (
    <label
      htmlFor={id}
      className={`
        flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition-colors
        ${error ? "border-clay bg-clay/5" : checked ? "border-pine bg-sage-light" : "border-line bg-card"}
      `}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-5 w-5 shrink-0 accent-pine cursor-pointer"
      />
      <span className="text-sm leading-relaxed text-pine-dark">
        {children}
        {required && <span className="text-clay"> *</span>}
      </span>
    </label>
  );
}
