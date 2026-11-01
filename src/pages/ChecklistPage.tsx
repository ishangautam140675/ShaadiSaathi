import React, { useState, useMemo } from 'react';
import { useTranslation } from '../context/LanguageContext';
import { useWedding } from '../context/WeddingContext';
import { useAuth } from '../context/useAuth';
import { Badge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { AddChecklistTaskModal } from '../components/modals/AddChecklistTaskModal';
import { DeleteConfirmationModal } from '../components/modals/DeleteConfirmationModal';
import type { ChecklistPhase, ChecklistTask, ChecklistTaskEntity } from '../types';
import {
  CheckSquare,
  Plus,
  Calendar,
  Filter,
  CheckCircle2,
  User,
  Edit2,
  Trash2,
  Lock,
  Clock,
} from 'lucide-react';

export const ChecklistPage: React.FC = () => {
  const { t, language } = useTranslation();
  const {
    checklistTasks,
    toggleTaskCompletion,
    deleteChecklistTask,
    checklistSummary,
    isPreviewMode,
    togglePreviewMode,
  } = useWedding();
  const { user } = useAuth();
  const isViewer = user?.role === 'VIEWER';

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<ChecklistTask | ChecklistTaskEntity | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<ChecklistTask | ChecklistTaskEntity | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filters state
  const [selectedPhase, setSelectedPhase] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');

  const filteredTasks = useMemo(() => {
    return checklistTasks.filter((task) => {
      const matchesPhase = selectedPhase === 'all' || task.phase === selectedPhase;
      const matchesPriority = selectedPriority === 'all' || task.priority === selectedPriority;
      return matchesPhase && matchesPriority;
    });
  }, [checklistTasks, selectedPhase, selectedPriority]);

  const completedCount = checklistSummary?.completedTasks ?? checklistTasks.filter((t) => t.isCompleted || t.status === 'completed').length;
  const totalCount = checklistSummary?.totalTasks ?? checklistTasks.length;
  const progressPct = checklistSummary?.completionPercentage ?? (totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0);

  const phaseLabels: Record<ChecklistPhase, string> = {
    '6_months': t.checklist.phase6m,
    '3_months': t.checklist.phase3m,
    '1_month': t.checklist.phase1m,
    'wedding_week': t.checklist.phaseWeek,
    'day_of': t.checklist.phaseDay,
    'post_wedding': t.checklist.phasePost,
  };

  const handleDeleteConfirm = async () => {
    if (!taskToDelete) return;
    try {
      setIsDeleting(true);
      await deleteChecklistTask(taskToDelete.id);
      setTaskToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-gold/25">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-royal text-burgundy">
            {t.checklist.title}
          </h1>
          <p className="text-xs sm:text-sm text-charcoal-muted mt-1">
            {t.checklist.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isViewer ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gold/15 text-gold-dark text-xs font-semibold">
              <Lock className="w-3.5 h-3.5" />
              <span>{language === 'hi' ? 'केवल पठन अनुमति' : 'Read-Only (Viewer)'}</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setTaskToEdit(null);
                setIsModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-burgundy hover:bg-burgundy-dark text-ivory text-sm font-semibold transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-4 h-4 text-gold-light" />
              <span>{t.checklist.addTaskBtn}</span>
            </button>
          )}
        </div>
      </div>

      {/* Progress Card */}
      <div className="bg-ivory-light p-4 rounded-2xl border border-gold/30 card-shadow flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gold/20 flex items-center justify-center text-burgundy">
            <CheckSquare className="w-5 h-5 text-burgundy" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-burgundy">
                {completedCount} of {totalCount} {t.checklist.tasksCompleted}
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-sage/20 text-sage-dark">
                {progressPct}%
              </span>
            </div>
            <p className="text-xs text-charcoal-muted mt-0.5">
              {totalCount - completedCount} tasks remaining across all preparation stages
            </p>
          </div>
        </div>

        <div className="w-full sm:w-48 bg-rose/30 rounded-full h-2.5 overflow-hidden border border-gold/25">
          <div
            className="bg-burgundy h-full transition-all duration-500 rounded-full"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Filter Tabs & Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedPhase('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              selectedPhase === 'all'
                ? 'bg-burgundy text-ivory shadow-xs'
                : 'bg-ivory border border-gold/30 text-charcoal hover:bg-rose/40'
            }`}
          >
            {t.checklist.allPhases}
          </button>
          {(Object.keys(phaseLabels) as ChecklistPhase[]).map((phase) => (
            <button
              key={phase}
              type="button"
              onClick={() => setSelectedPhase(phase)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                selectedPhase === phase
                  ? 'bg-burgundy text-ivory shadow-xs'
                  : 'bg-ivory border border-gold/30 text-charcoal hover:bg-rose/40'
              }`}
            >
              {phaseLabels[phase]}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 bg-ivory px-3 py-1.5 rounded-xl border border-gold/40 self-start sm:self-auto">
          <Filter className="w-3.5 h-3.5 text-gold-dark" />
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="bg-transparent text-xs font-semibold text-charcoal focus:outline-none capitalize"
          >
            <option value="all">{language === 'hi' ? 'सभी प्राथमिकता' : 'All Priorities'}</option>
            <option value="urgent">{language === 'hi' ? 'अति आवश्यक (Urgent)' : 'Urgent'}</option>
            <option value="high">{language === 'hi' ? 'उच्च (High)' : 'High'}</option>
            <option value="medium">{language === 'hi' ? 'सामान्य (Medium)' : 'Medium'}</option>
            <option value="low">{language === 'hi' ? 'कम (Low)' : 'Low'}</option>
          </select>
        </div>
      </div>

      {/* Checklist Tasks List */}
      {filteredTasks.length === 0 ? (
        <EmptyState
          icon={<CheckSquare className="w-8 h-8 text-burgundy" />}
          title={t.checklist.emptyTitle}
          description={t.checklist.emptySubtitle}
          actionLabel={!isViewer ? t.checklist.addTaskBtn : undefined}
          onAction={() => {
            setTaskToEdit(null);
            setIsModalOpen(true);
          }}
          secondaryActionLabel={
            isPreviewMode ? undefined : t.dashboard.emptyStateToggle
          }
          onSecondaryAction={togglePreviewMode}
        />
      ) : (
        <div className="space-y-2.5">
          {filteredTasks.map((task) => {
            const isCompleted = task.isCompleted || task.status === 'completed';
            return (
              <div
                key={task.id}
                className={`p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 flex items-center justify-between gap-3 ${
                  isCompleted
                    ? 'bg-sage/10 border-sage/30'
                    : 'bg-ivory-light border-gold/30 hover:border-gold/60 card-shadow'
                }`}
              >
                <div className="flex items-center gap-3.5 flex-1 min-w-0">
                  <button
                    type="button"
                    disabled={isViewer}
                    onClick={() => toggleTaskCompletion(task.id)}
                    className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors flex-shrink-0 cursor-pointer disabled:cursor-not-allowed ${
                      isCompleted
                        ? 'bg-sage text-ivory'
                        : 'border border-gold/60 hover:border-burgundy bg-ivory'
                    }`}
                  >
                    {isCompleted && <CheckCircle2 className="w-4 h-4" />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <span
                      className={`text-sm font-semibold flex items-center gap-1.5 flex-wrap truncate ${
                        isCompleted
                          ? 'line-through text-charcoal-muted'
                          : 'text-charcoal'
                      }`}
                    >
                      <span>{task.title}</span>
                      {task.isOfflineDraft && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-300 not-italic no-underline">
                          <Clock className="w-2.5 h-2.5" />
                          {language === 'hi' ? 'स्थानीय ड्राफ्ट' : 'Offline Draft'}
                        </span>
                      )}
                    </span>

                    <div className="flex items-center gap-3 text-[11px] text-charcoal-muted mt-1 flex-wrap">
                      <span className="px-2 py-0.5 rounded-full bg-gold/15 text-gold-dark font-semibold">
                        {task.category}
                      </span>

                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3 text-gold-dark" />
                        {task.assignedTo}
                      </span>

                      {task.dueDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-burgundy" />
                          {task.dueDate}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      task.priority === 'urgent'
                        ? 'rose'
                        : task.priority === 'high'
                        ? 'gold'
                        : 'outline'
                    }
                    size="sm"
                  >
                    {task.priority ? task.priority.toUpperCase() : 'MEDIUM'}
                  </Badge>

                  {/* Actions Bar */}
                  {!isViewer && (
                    <div className="flex items-center gap-1 ml-1">
                      <button
                        type="button"
                        onClick={() => {
                          setTaskToEdit(task);
                          setIsModalOpen(true);
                        }}
                        className="p-1 rounded-lg border border-gold/40 hover:bg-rose/30 text-charcoal text-xs cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setTaskToDelete(task)}
                        className="p-1 rounded-lg border border-burgundy/30 text-burgundy hover:bg-burgundy/10 text-xs cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Task Modal */}
      <AddChecklistTaskModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setTaskToEdit(null);
        }}
        taskToEdit={taskToEdit}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={Boolean(taskToDelete)}
        onClose={() => setTaskToDelete(null)}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
        title={language === 'hi' ? 'कार्य हटाएं' : 'Delete Checklist Task'}
        description={language === 'hi' ? 'क्या आप निश्चित रूप से इस कार्य को सूची से हटाना चाहते हैं?' : 'Are you sure you want to remove this task from the wedding checklist?'}
        itemName={taskToDelete?.title}
      />
    </div>
  );
};
