import React from 'react';
import { cn } from '../lib/utils';

export const Card = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("bg-white rounded-[28px] shadow-sm border-4 border-[#F2EBE1] p-5", className)} {...props}>
    {children}
  </div>
);

export const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'outline' | 'ghost' }>(
  ({ className, variant = 'primary', ...props }, ref) => {
    const variants = {
      primary: "bg-[#82C881] text-white shadow-[0_4px_0_#629F61] active:shadow-none active:translate-y-[4px]",
      secondary: "bg-[#FFE1A8] text-[#5C4D43] shadow-[0_4px_0_#D9B678] active:shadow-none active:translate-y-[4px]",
      outline: "border-4 border-[#F2EBE1] bg-white text-[#5C4D43] active:translate-y-[2px]",
      ghost: "bg-transparent text-[#5C4D43]",
    };
    
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-[24px] px-5 py-4 text-lg transition-all focus:outline-none disabled:opacity-50 disabled:pointer-events-none",
          variants[variant],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "block w-full min-w-0 max-w-full rounded-[20px] border-4 border-[#F2EBE1] bg-[#FAF5E8] px-4 py-4 text-base placeholder:text-[#A89E95] focus:outline-none focus:border-[#82C881] disabled:cursor-not-allowed disabled:opacity-50 text-[#5C4D43] transition-colors appearance-none",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

export const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn("text-base text-[#5C4D43] mb-2 block", className)}
      {...props}
    />
  )
);
Label.displayName = "Label";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "block w-full min-w-0 max-w-full rounded-[20px] border-4 border-[#F2EBE1] bg-[#FAF5E8] px-4 py-4 text-base text-[#5C4D43] focus:outline-none focus:border-[#82C881] transition-colors appearance-none",
        className
      )}
      {...props}
    />
  )
);
Select.displayName = "Select";
