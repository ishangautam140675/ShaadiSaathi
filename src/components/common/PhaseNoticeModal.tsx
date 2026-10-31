import React from 'react';
import { Modal } from './Modal';
import { useTranslation } from '../../context/LanguageContext';
import { ShieldCheck, Calendar, CheckCircle2 } from 'lucide-react';

interface PhaseNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName: string;
  targetPhase: string;
  description: string;
  checklistItems?: string[];
}

export const PhaseNoticeModal: React.FC<PhaseNoticeModalProps> = ({
  isOpen,
  onClose,
  featureName,
  targetPhase,
  description,
  checklistItems = [],
}) => {
  const { t, language } = useTranslation();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${featureName} (${targetPhase})`}
      subtitle={language === 'hi' ? 'ईमानदार वास्तुकला योजना' : 'Honest Engineering Roadmap'}
      maxWidth="md"
    >
      <div className="space-y-4">
        <div className="p-4 rounded-xl bg-rose/40 border border-gold/30 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-burgundy flex-shrink-0 mt-0.5" />
          <div className="text-xs text-charcoal leading-relaxed">
            <span className="font-bold text-burgundy block mb-1">
              {language === 'hi' ? 'परियोजना नियम: कोई बनावटी दावा नहीं' : 'Project Rule: Zero Fake Claims'}
            </span>
            {description}
          </div>
        </div>

        {checklistItems.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-burgundy uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-gold-dark" />
              {language === 'hi' ? 'इस चरण में क्या शामिल होगा:' : 'What will be delivered in this phase:'}
            </h4>
            <ul className="space-y-2 text-xs text-charcoal">
              {checklistItems.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 bg-ivory-light p-2.5 rounded-lg border border-gold/20">
                  <CheckCircle2 className="w-4 h-4 text-sage flex-shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-burgundy text-ivory text-xs font-semibold hover:bg-burgundy-dark transition-colors cursor-pointer"
          >
            {t.common.gotIt}
          </button>
        </div>
      </div>
    </Modal>
  );
};
