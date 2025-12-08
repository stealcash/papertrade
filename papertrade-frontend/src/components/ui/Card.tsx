import { HTMLAttributes, ReactNode } from 'react';
import { clsx } from 'clsx';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export default function Card({ children, className, ...props }: CardProps) {
  return (
    <div
      className={clsx(
        'rounded-2xl shadow-sm',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

