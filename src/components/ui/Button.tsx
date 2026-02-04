import { ButtonHTMLAttributes, forwardRef, ReactNode } from 'react';
import { cn } from '../../utils/classnames';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  loadingText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      loadingText,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      ...props
    },
    ref
  ) => {
    const variants = {
      primary: [
        'bg-indigo-600 text-white',
        'hover:bg-indigo-700',
        'focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2',
        'shadow-sm shadow-indigo-100',
        'disabled:bg-indigo-300 disabled:shadow-none',
      ],
      secondary: [
        'bg-gray-100 text-gray-900',
        'hover:bg-gray-200',
        'focus:ring-2 focus:ring-gray-500 focus:ring-offset-2',
        'disabled:bg-gray-50 disabled:text-gray-400',
      ],
      outline: [
        'bg-white text-gray-700 border border-gray-300',
        'hover:bg-gray-50 hover:border-gray-400',
        'focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2',
        'disabled:bg-gray-50 disabled:text-gray-400 disabled:border-gray-200',
      ],
      ghost: [
        'bg-transparent text-gray-700',
        'hover:bg-gray-100',
        'focus:ring-2 focus:ring-gray-500 focus:ring-offset-2',
        'disabled:text-gray-400',
      ],
      danger: [
        'bg-rose-600 text-white',
        'hover:bg-rose-700',
        'focus:ring-2 focus:ring-rose-500 focus:ring-offset-2',
        'shadow-sm shadow-rose-100',
        'disabled:bg-rose-300 disabled:shadow-none',
      ],
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-xs',
      md: 'px-4 py-2.5 text-sm',
      lg: 'px-6 py-3 text-base',
    };

    const iconSizes = {
      sm: 14,
      md: 16,
      lg: 18,
    };

    return (
      <button
        ref={ref}
        className={cn(
          // Base styles
          'inline-flex items-center justify-center gap-2',
          'font-semibold rounded-lg',
          'transition-all duration-200 ease-in-out',
          'focus:outline-none',
          'disabled:cursor-not-allowed',
          'active:scale-[0.98]',
          // Variant styles
          variants[variant],
          // Size styles
          sizes[size],
          // Full width
          fullWidth && 'w-full',
          // Loading state
          isLoading && 'opacity-80',
          className
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 
              size={iconSizes[size]} 
              className="animate-spin" 
              aria-hidden="true"
            />
            {loadingText || children}
          </>
        ) : (
          <>
            {leftIcon}
            {children}
            {rightIcon}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

// Icon button variant
interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  label: string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      icon,
      className,
      variant = 'secondary',
      size = 'md',
      isLoading = false,
      label,
      disabled,
      ...props
    },
    ref
  ) => {
    const variants = {
      primary: [
        'bg-indigo-600 text-white',
        'hover:bg-indigo-700',
        'focus:ring-2 focus:ring-indigo-500',
        'disabled:bg-indigo-300',
      ],
      secondary: [
        'bg-gray-100 text-gray-700',
        'hover:bg-gray-200',
        'focus:ring-2 focus:ring-gray-500',
        'disabled:bg-gray-50 disabled:text-gray-400',
      ],
      outline: [
        'bg-white text-gray-700 border border-gray-300',
        'hover:bg-gray-50',
        'focus:ring-2 focus:ring-indigo-500',
        'disabled:bg-gray-50 disabled:text-gray-400',
      ],
      ghost: [
        'bg-transparent text-gray-700',
        'hover:bg-gray-100',
        'focus:ring-2 focus:ring-gray-500',
        'disabled:text-gray-400',
      ],
      danger: [
        'bg-rose-100 text-rose-600',
        'hover:bg-rose-200',
        'focus:ring-2 focus:ring-rose-500',
        'disabled:bg-rose-50 disabled:text-rose-300',
      ],
    };

    const sizes = {
      sm: 'p-1.5',
      md: 'p-2',
      lg: 'p-3',
    };

    const iconSizes = {
      sm: 14,
      md: 18,
      lg: 22,
    };

    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-lg',
          'transition-all duration-200 ease-in-out',
          'focus:outline-none',
          'disabled:cursor-not-allowed',
          'active:scale-[0.95]',
          variants[variant],
          sizes[size],
          isLoading && 'opacity-80',
          className
        )}
        disabled={disabled || isLoading}
        aria-label={label}
        title={label}
        {...props}
      >
        {isLoading ? (
          <Loader2 
            size={iconSizes[size]} 
            className="animate-spin" 
          />
        ) : (
          icon
        )}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';

export default Button;
