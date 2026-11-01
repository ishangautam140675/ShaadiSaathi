import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { useTranslation } from '../../context/LanguageContext';
import { useWedding } from '../../context/WeddingContext';
import type { ChecklistPhase, ChecklistTask, ChecklistTaskEntity } from '../../types';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface AddChecklistTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskToEdit?: ChecklistTask | ChecklistTaskEntity | null;
}

export const AddChecklistTaskModal: React.FC<AddChecklistTaskModalProps> = ({
  isOpen,
  onClose,
  taskToEdit,
}) => {
  const { t, language } = useTranslation();
  const { addChecklistTask, updateChecklistTask } = useWedding();
  const isEditing = Boolean(taskToEdit);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Preparations');
  const [phase, setPhase] = useState<ChecklistPhase>('1_month');
  const [assignedTo, setAssignedTo] = useState('Family Member');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [dueDate, setDueDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (taskToEdit) {
      setTitle(taskToEdit.title || '');
      setCategory(taskToEdit.category || 'Preparations');
      setPhase(taskToEdit.phase || '1_month');
      setAssignedTo(taskToEdit.assignedTo || 'Family Member');
      setPriority(taskToEdit.priority || 'medium');
      setDueDate(taskToEdit.dueDate || new Date().toISOString().split('T')[0]);
      setNotes(taskToEdit.notes || '');
    } else {
      setTitle('');
      setCategory('Preparations');
      setPhase('1_month');
      setAssignedTo('Family Member');
      setPriority('medium');
      setDueDate(new Date().toISOString().split('T')[0]);
      setNotes('');
    }
    setError(null);
    setSuccess(null);
  }, [taskToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!title.trim()) {
      setError(language === 'hi' ? 'कार्य का शीर्षक आवश्यक है।' : 'Task title is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        title: title.trim(),
        category: category.trim() || 'Preparations',
        phase,
        assignedTo: assignedTo.trim() || 'Family Member',
        priority,
        dueDate,
        notes: notes.trim() || undefined,
      };

      if (isEditing && taskToEdit) {
        await updateChecklistTask(taskToEdit.id, payload);
        setSuccess(language === 'hi' ? 'कार्य अद्यतन हो गया।' : 'Task updated successfully.');
      } else {
        await addChecklistTask(payload);
        setSuccess(language === 'hi' ? 'कार्य सूची में जोड़ा गया।' : 'Task added to checklist.');
      }

      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Operation failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? (language === 'hi' ? 'कार्य संपादित करें' : 'Edit Checklist Task') : t.checklist.modalTitle}
      subtitle={language === 'hi' ? 'परिवार के सदस्यों के लिए कर्तव्य एवं समय-सीमा तय करें।' : 'Plan custom duties for family members, logistics, and ritual timings.'}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-burgundy/10 border border-burgundy/30 text-burgundy text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 rounded-xl bg-sage/20 border border-sage/40 text-sage-dark text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Title */}
        <div>
          <label htmlFor="task-title-input" className="block text-xs font-semibold text-charcoal mb-1">
            {language === 'hi' ? 'कार्य शीर्षक *' : 'Task Title *'}
          </label>
          <input
            id="task-title-input"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Finalize Pandit Ji & Muhurat, Book Dhol Walas"
            className="w-full px-3 py-2 rounded-xl border border-gold/40 bg-ivory text-charcoal text-xs sm:text-sm focus:border-burgundy"
          />
        </div>

        {/* Phase & Priority */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-charcoal mb-1">
              {language === 'hi' ? 'समय सीमा चरण *' : 'Timeline Phase *'}
            </label>
            <select
              value={phase}
              onChange={(e) => setPhase(e.target.value as ChecklistPhase)}
              className="w-full px-3 py-2 rounded-xl border border-gold/40 bg-ivory text-charcoal text-xs sm:text-sm focus:border-burgundy"
            >
              <option value="6_months">{t.checklist.phase6m}</option>
              <option value="3_months">{t.checklist.phase3m}</option>
              <option value="1_month">{t.checklist.phase1m}</option>
              <option value="wedding_week">{t.checklist.phaseWeek}</option>
              <option value="day_of">{t.checklist.phaseDay}</option>
              <option value="post_wedding">{t.checklist.phasePost}</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-charcoal mb-1">
              {language === 'hi' ? 'प्राथमिकता' : 'Priority'}
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl border border-gold/40 bg-ivory text-charcoal text-xs sm:text-sm focus:border-burgundy capitalize"
            >
              <option value="urgent">{language === 'hi' ? 'अति आवश्यक (Urgent)' : 'Urgent'}</option>
              <option value="high">{language === 'hi' ? 'उच्च (High)' : 'High'}</option>
              <option value="medium">{language === 'hi' ? 'सामान्य (Medium)' : 'Medium'}</option>
              <option value="low">{language === 'hi' ? 'कम (Low)' : 'Low'}</option>
            </select>
          </div>
        </div>

        {/* Category & Assigned To */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-charcoal mb-1">
              {language === 'hi' ? 'श्रेणी' : 'Category'}
            </label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Venue, Rituals, Shopping, Logistics"
              className="w-full px-3 py-2 rounded-xl border border-gold/40 bg-ivory text-charcoal text-xs sm:text-sm focus:border-burgundy"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-charcoal mb-1">
              {language === 'hi' ? 'जिम्मेदार सदस्य *' : 'Assigned Member *'}
            </label>
            <input
              type="text"
              required
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              placeholder="e.g. Chacha Ji, Priya, Kabir"
              className="w-full px-3 py-2 rounded-xl border border-gold/40 bg-ivory text-charcoal text-xs sm:text-sm focus:border-burgundy"
            />
          </div>
        </div>

        {/* Due Date & Notes */}
        <div>
          <label className="block text-xs font-semibold text-charcoal mb-1">
            {language === 'hi' ? 'नियत तारीख *' : 'Due Date *'}
          </label>
          <input
            type="date"
            required
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-gold/40 bg-ivory text-charcoal text-xs sm:text-sm focus:border-burgundy"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-charcoal mb-1">
            {language === 'hi' ? 'विशेष निर्देश / विवरण' : 'Notes / Instructions'}
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Confirm samagri list with Pandit Ji 2 days before"
            className="w-full px-3 py-2 rounded-xl border border-gold/40 bg-ivory text-charcoal text-xs sm:text-sm focus:border-burgundy"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-gold/20">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-gold/40 text-charcoal text-xs sm:text-sm font-semibold hover:bg-rose/30 cursor-pointer"
          >
            {t.expenses.cancelBtn}
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 rounded-xl bg-burgundy hover:bg-burgundy-dark text-ivory text-xs sm:text-sm font-semibold transition-all shadow-sm hover:shadow-md cursor-pointer disabled:opacity-50"
          >
            {isSubmitting
              ? (language === 'hi' ? 'सहेज रहे हैं...' : 'Saving...')
              : isEditing
              ? (language === 'hi' ? 'विवरण अद्यतन करें' : 'Save Changes')
              : (language === 'hi' ? 'कार्य जोड़ें' : 'Add Task')}
          </button>
        </div>
      </form>
    </Modal>
  );
};
