import React from 'react';
import { useTranslation } from '../../context/LanguageContext';
import { Sparkles } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className = '',
}) => {
  const { t } = useTranslation();

  return (
    <div
      className={`rounded-2xl border border-dashed border-gold/40 bg-ivory-light/60 p-8 sm:p-12 text-center flex flex-col items-center justify-center max-w-lg mx-auto my-6 ${className}`}
    >
      <div className="w-16 h-16 rounded-2xl bg-rose/50 border border-gold/30 flex items-center justify-center text-burgundy mb-4 shadow-2xs">
        {icon || <Sparkles className="w-8 h-8 text-gold-dark" />}
      </div>

      <h3 className="text-lg sm:text-xl font-bold text-burgundy mb-2">
        {title}
      </h3>

      <p className="text-sm text-charcoal-muted max-w-sm mb-6 leading-relaxed">
        {description}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {actionLabel && onAction && (
          <button
            type="button"
            onClick={onAction}
            className="px-5 py-2.5 rounded-xl bg-burgundy hover:bg-burgundy-dark text-ivory text-sm font-semibold transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer inline-flex items-center gap-2"
          >
            <span>{actionLabel}</span>
          </button>
        )}

        {secondaryActionLabel && onSecondaryAction && (
          <button
            type="button"
            onClick={onSecondaryAction}
            className="px-4 py-2.5 rounded-xl border border-gold/50 bg-ivory text-burgundy hover:bg-rose/40 text-sm font-medium transition-colors cursor-pointer"
          >
            {secondaryActionLabel}
          </button>
        )}
      </div>

      <div className="mt-6 text-[11px] text-charcoal-muted/80 bg-rose-light/50 px-3 py-1.5 rounded-md border border-rose-dark/20">
        ℹ️ {t.common.phaseNoticeDesc}
      </div>
    </div>
  );
};
