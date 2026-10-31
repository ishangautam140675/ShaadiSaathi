import React from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  variant?: 'burgundy' | 'ivory' | 'sage' | 'gold';
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  badge,
  variant = 'ivory',
  className = '',
}) => {
  const variantStyles = {
    ivory: 'bg-ivory-light border-gold-accent text-charcoal',
    burgundy: 'bg-burgundy text-ivory border-burgundy-dark shadow-md',
    sage: 'bg-sage/10 border-sage/30 text-charcoal',
    gold: 'bg-gold/10 border-gold/40 text-charcoal',
  };

  const titleStyles = {
    ivory: 'text-charcoal-muted',
    burgundy: 'text-rose-light/90',
    sage: 'text-sage-dark',
    gold: 'text-gold-dark',
  };

  const valueStyles = {
    ivory: 'text-burgundy',
    burgundy: 'text-ivory',
    sage: 'text-charcoal',
    gold: 'text-charcoal',
  };

  return (
    <div
      className={`rounded-2xl p-4 sm:p-5 transition-all duration-200 card-shadow relative overflow-hidden border ${variantStyles[variant]} ${className}`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <span className={`text-xs sm:text-sm font-semibold tracking-wide ${titleStyles[variant]}`}>
          {title}
        </span>
        {icon && (
          <div
            className={`p-2 rounded-xl flex-shrink-0 ${
              variant === 'burgundy'
                ? 'bg-ivory/15 text-gold-light'
                : 'bg-rose/40 text-burgundy'
            }`}
          >
            {icon}
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-2 mt-1">
        <div className={`text-2xl sm:text-3xl font-bold tracking-tight ${valueStyles[variant]}`}>
          {value}
        </div>
        {badge}
      </div>

      {subtitle && (
        <p
          className={`text-xs mt-2 font-medium ${
            variant === 'burgundy' ? 'text-rose-light/80' : 'text-charcoal-muted'
          }`}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
};
