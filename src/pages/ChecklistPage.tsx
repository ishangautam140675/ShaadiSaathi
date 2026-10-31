import React, { useState, useMemo } from 'react';
import { useTranslation } from '../context/LanguageContext';
import { useWedding } from '../context/WeddingContext';
import { Badge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import type { ChecklistPhase } from '../types';
import {
  CheckSquare,
  Plus,
  Calendar,
  Filter,
  CheckCircle2,
  Clock,
  User,
} from 'lucide-react';

export const ChecklistPage: React.FC = () => {
  const { t, language } = useTranslation();
  const { checklistTasks, toggleTaskCompletion, addChecklistTask, isPreviewMode, togglePreviewMode } = useWedding();

  const [selectedPhase, setSelectedPhase] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);

  // New task form state
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPhase, setNewTaskPhase] = useState<ChecklistPhase>('1_month');
  const [newTaskAssignedTo, setNewTaskAssignedTo] = useState('Family Member');
  const [newTaskPriority, setNewTaskPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [newTaskDueDate, setNewTaskDueDate] = useState(() => new Date().toISOString().split('T')[0]);

  const filteredTasks = useMemo(() => {
    return checklistTasks.filter((task) => {
      const matchesPhase = selectedPhase === 'all' || task.phase === selectedPhase;
      const matchesPriority = selectedPriority === 'all' || task.priority === selectedPriority;
      return matchesPhase && matchesPriority;
    });
  }, [checklistTasks, selectedPhase, selectedPriority]);

  const completedCount = checklistTasks.filter((t) => t.isCompleted).length;
  const totalCount = checklistTasks.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const phaseLabels: Record<ChecklistPhase, string> = {
    '6_months': t.checklist.phase6m,
    '3_months': t.checklist.phase3m,
    '1_month': t.checklist.phase1m,
    'wedding_week': t.checklist.phaseWeek,
    'day_of': t.checklist.phaseDay,
    'post_wedding': t.checklist.phasePost,
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    addChecklistTask({
      title: newTaskTitle.trim(),
      phase: newTaskPhase,
      category: 'Preparations',
      isCompleted: false,
      priority: newTaskPriority,
      assignedTo: newTaskAssignedTo.trim() || 'Family Member',
      dueDate: newTaskDueDate,
    });

    setNewTaskTitle('');
    setIsNewTaskModalOpen(false);
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

        <button
          type="button"
          onClick={() => setIsNewTaskModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-burgundy hover:bg-burgundy-dark text-ivory text-sm font-semibold transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 text-gold-light" />
          <span>{t.checklist.addTaskBtn}</span>
        </button>
      </div>

      {/* Progress Overview Card */}
      <div className="bg-ivory-light rounded-2xl p-5 border border-gold/30 card-shadow space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-sage" />
            <h2 className="text-sm font-bold text-burgundy uppercase tracking-wider">
              {t.checklist.completionProgress}
            </h2>
          </div>
          <span className="text-sm font-bold text-burgundy">
            {completedCount} of {totalCount} ({progressPct}%)
          </span>
        </div>

        <div
          role="progressbar"
          aria-valuenow={progressPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t.checklist.completionProgress}
          className="w-full bg-rose/40 h-3 rounded-full overflow-hidden border border-gold/30 p-0.5"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-gold to-sage transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-ivory-light rounded-2xl p-4 border border-gold/30 card-shadow flex flex-wrap gap-3 items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap flex-1">
          <div className="flex items-center gap-1.5 bg-ivory px-3 py-1.5 rounded-xl border border-gold/40">
            <Calendar className="w-3.5 h-3.5 text-gold-dark" />
            <select
              value={selectedPhase}
              onChange={(e) => setSelectedPhase(e.target.value)}
              className="bg-transparent text-xs font-semibold text-charcoal focus:outline-none"
            >
              <option value="all">{t.checklist.allPhases}</option>
              {Object.entries(phaseLabels).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-ivory px-3 py-1.5 rounded-xl border border-gold/40">
            <Filter className="w-3.5 h-3.5 text-gold-dark" />
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="bg-transparent text-xs font-semibold text-charcoal focus:outline-none capitalize"
            >
              <option value="all">All Priorities</option>
              <option value="high">High Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="low">Low Priority</option>
            </select>
          </div>
        </div>

        <span className="text-xs text-charcoal-muted">
          {filteredTasks.length} {language === 'hi' ? 'कार्य प्रदर्शित' : 'tasks shown'}
        </span>
      </div>

      {/* Checklist Tasks List */}
      {filteredTasks.length === 0 ? (
        <EmptyState
          icon={<CheckSquare className="w-8 h-8 text-burgundy" />}
          title={t.checklist.emptyTitle}
          description={t.checklist.emptySubtitle}
          actionLabel={t.checklist.addTaskBtn}
          onAction={() => setIsNewTaskModalOpen(true)}
          secondaryActionLabel={
            isPreviewMode ? undefined : t.dashboard.emptyStateToggle
          }
          onSecondaryAction={togglePreviewMode}
        />
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => (
            <div
              key={task.id}
              className={`p-4 rounded-2xl border transition-all duration-200 flex items-start justify-between gap-4 card-shadow ${
                task.isCompleted
                  ? 'bg-rose-light/40 border-sage/40 text-charcoal-muted'
                  : 'bg-ivory-light border-gold/30 hover:border-gold/60 text-charcoal'
              }`}
            >
              <div className="flex items-start gap-3.5 min-w-0">
                <input
                  type="checkbox"
                  id={`chk-task-${task.id}`}
                  checked={task.isCompleted}
                  onChange={() => toggleTaskCompletion(task.id)}
                  className="w-5 h-5 rounded text-burgundy border-gold/50 focus:ring-burgundy mt-0.5 cursor-pointer flex-shrink-0"
                />
                <label htmlFor={`chk-task-${task.id}`} className="min-w-0 flex-1 cursor-pointer">
                  <h3
                    className={`text-sm sm:text-base font-semibold leading-snug ${
                      task.isCompleted ? 'line-through text-charcoal-muted' : 'text-charcoal'
                    }`}
                  >
                    {task.title}
                  </h3>

                  <div className="flex items-center gap-3 text-xs text-charcoal-muted mt-2 flex-wrap">
                    <span className="flex items-center gap-1 font-semibold text-burgundy">
                      <User className="w-3.5 h-3.5 text-gold-dark" />
                      {task.assignedTo}
                    </span>
                    <span>&bull;</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-gold-dark" />
                      {task.dueDate}
                    </span>
                    <span>&bull;</span>
                    <Badge variant="outline" size="sm">
                      {phaseLabels[task.phase] || task.phase}
                    </Badge>
                  </div>
                </label>
              </div>

              <Badge
                variant={
                  task.priority === 'high'
                    ? 'burgundy'
                    : task.priority === 'medium'
                    ? 'gold'
                    : 'sage'
                }
                size="sm"
                className="flex-shrink-0"
              >
                {task.priority.toUpperCase()}
              </Badge>
            </div>
          ))}
        </div>
      )}

      {/* Quick Add Task Modal */}
      {isNewTaskModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/60 backdrop-blur-xs"
        >
          <div className="w-full max-w-lg bg-ivory rounded-2xl border border-gold/40 shadow-2xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-burgundy font-royal">
              {t.checklist.modalTitle}
            </h3>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label htmlFor="task-title" className="block text-xs font-semibold text-charcoal mb-1">
                  Task Description *
                </label>
                <input
                  id="task-title"
                  type="text"
                  required
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="e.g. Confirm wedding car decorations with florist"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gold/40 bg-ivory-light text-charcoal text-sm focus:border-burgundy"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="task-phase" className="block text-xs font-semibold text-charcoal mb-1">
                    Timeline Phase
                  </label>
                  <select
                    id="task-phase"
                    value={newTaskPhase}
                    onChange={(e) => setNewTaskPhase(e.target.value as ChecklistPhase)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gold/40 bg-ivory-light text-charcoal text-sm focus:border-burgundy"
                  >
                    {Object.entries(phaseLabels).map(([k, label]) => (
                      <option key={k} value={k}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="task-priority" className="block text-xs font-semibold text-charcoal mb-1">
                    Priority
                  </label>
                  <select
                    id="task-priority"
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value as any)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gold/40 bg-ivory-light text-charcoal text-sm focus:border-burgundy"
                  >
                    <option value="high">High Priority</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="task-assigned-to" className="block text-xs font-semibold text-charcoal mb-1">
                    Assigned Family Member
                  </label>
                  <input
                    id="task-assigned-to"
                    type="text"
                    value={newTaskAssignedTo}
                    onChange={(e) => setNewTaskAssignedTo(e.target.value)}
                    placeholder="e.g. Chacha Ji, Aman, Sister"
                    className="w-full px-3.5 py-2 rounded-xl border border-gold/40 bg-ivory-light text-charcoal text-sm focus:border-burgundy"
                  />
                </div>

                <div>
                  <label htmlFor="task-due-date" className="block text-xs font-semibold text-charcoal mb-1">
                    Target Completion Date
                  </label>
                  <input
                    id="task-due-date"
                    type="date"
                    value={newTaskDueDate}
                    onChange={(e) => setNewTaskDueDate(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gold/40 bg-ivory-light text-charcoal text-sm focus:border-burgundy"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsNewTaskModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gold/40 text-xs font-semibold text-charcoal"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-burgundy text-ivory text-xs font-semibold hover:bg-burgundy-dark"
                >
                  {t.common.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
