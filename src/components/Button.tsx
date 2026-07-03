import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}) => {
  const baseStyles = "inline-flex items-center justify-center rounded-full font-medium tracking-wide transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    primary: "bg-brand-900 hover:bg-brand-800 text-white shadow-lg shadow-brand-900/25 border border-transparent dark:bg-white dark:text-brand-900 dark:hover:bg-brand-50 dark:shadow-black/40",
    secondary: "bg-ivory text-brand-900 hover:bg-white border border-brand-900/15 shadow-sm dark:bg-white/95 dark:text-brand-900",
    outline: "bg-transparent border border-brand-900/30 text-brand-900 hover:bg-brand-50 dark:border-white/30 dark:text-white dark:hover:bg-white/10",
    ghost: "bg-transparent text-brand-800 hover:text-brand-900 hover:bg-brand-50 dark:text-brand-200 dark:hover:text-white dark:hover:bg-white/5"
  };

  const sizes = {
    sm: "px-4 py-1.5 text-sm",
    md: "px-6 py-2.5 text-base",
    lg: "px-8 py-3.5 text-lg"
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
