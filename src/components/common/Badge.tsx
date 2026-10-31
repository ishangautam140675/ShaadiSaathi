import React from 'react';

export type BadgeVariant =
  | 'burgundy'
  | 'gold'
  | 'sage'
  | 'rose'
  | 'charcoal'
  | 'outline';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  className?: string;
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'burgundy',
  size = 'md',
  className = '',
  icon,
}) => {
  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
  };

  const variantStyles = {
    burgundy: 'bg-burgundy/10 text-burgundy border border-burgundy/20 font-semibold',
    gold: 'bg-gold/15 text-gold-dark border border-gold/30 font-semibold',
    sage: 'bg-sage/15 text-sage-dark border border-sage/30 font-semibold',
    rose: 'bg-rose text-burgundy-dark border border-rose-dark/40 font-medium',
    charcoal: 'bg-charcoal/10 text-charcoal border border-charcoal/20 font-medium',
    outline: 'bg-transparent text-charcoal-light border border-gold/40 font-medium',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full tracking-wide transition-colors ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};
