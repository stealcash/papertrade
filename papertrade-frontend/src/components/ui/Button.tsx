import { ButtonHTMLAttributes, forwardRef } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { clsx } from 'clsx';

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onDrag' | 'onDragStart' | 'onDragEnd'> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
    const baseStyles = 'font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2';
    
    const variants = {
      primary: 'bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 text-white hover:shadow-xl hover:shadow-purple-500/50 hover:-translate-y-0.5 hover:from-violet-500 hover:to-pink-500',
      secondary: 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white hover:from-yellow-300 hover:to-orange-400 hover:shadow-xl',
      outline: 'border-2 border-purple-500 text-purple-600 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 hover:border-purple-600',
      ghost: 'text-purple-600 hover:bg-gradient-to-r hover:from-purple-100 hover:to-pink-100',
      danger: 'bg-gradient-to-r from-red-500 to-pink-600 text-white hover:from-red-600 hover:to-pink-700 hover:shadow-xl',
    };

    const sizes = {
      sm: 'px-4 py-2 text-sm',
      md: 'px-6 py-3 text-base',
      lg: 'px-8 py-4 text-lg',
    };

    const motionProps: HTMLMotionProps<'button'> = {
      whileHover: !disabled && !isLoading ? { scale: 1.02 } : undefined,
      whileTap: !disabled && !isLoading ? { scale: 0.98 } : undefined,
    };

    return (
      <motion.button
        ref={ref}
        {...motionProps}
        className={clsx(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || isLoading}
        {...(props as any)}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Loading...
          </span>
        ) : (
          children
        )}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';

export default Button;

