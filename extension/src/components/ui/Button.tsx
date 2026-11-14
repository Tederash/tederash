import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'default' | 'compact';
}

const VARIANT_CLASSES: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-accent text-accent-fg border border-transparent hover:opacity-90',
  secondary: 'bg-surface text-fg border border-border hover:bg-surface-elevated',
  ghost: 'bg-transparent text-fg border border-transparent hover:bg-surface-elevated',
  danger: 'bg-danger text-danger-fg border border-transparent hover:opacity-90',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'secondary', size = 'default', className = '', type = 'button', ...props }, ref) => {
    const sizeClasses =
      size === 'compact' ? 'min-h-[2.75rem] px-3 text-sm' : 'min-h-[2.75rem] min-w-[2.75rem] px-4 py-2 text-base';

    return (
      <button
        ref={ref}
        type={type}
        className={`inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${sizeClasses} ${VARIANT_CLASSES[variant]} ${className}`}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';
