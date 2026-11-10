'use client'

import { Archive, GraduationCap, Pencil } from 'lucide-react'
import { useState } from 'react'
import { EmptyState } from '@/components/ui/empty-state'
import { PanelHeader } from '@/components/ui/panel'
import { useWorkspace } from '@/state/workbench-store'
import type { LearningCategory, LearningStatus, LearningTopic } from '@/types/workbench'
import { LearningFormModal } from './learning-form-modal'
import { MissingMigrationBanner } from './missing-migration-banner'

const CATEGORY_LABELS: Record<LearningCategory, string> = {
  system_design: 'System Design',
  linux: 'Linux',
  aws: 'AWS',
  devops: 'DevOps',
  software_engineering: 'Software Engineering',
  software_architecture: 'Software Architecture',
  other: 'Other',
}
const CATEGORY_ORDER: LearningCategory[] = [
  'system_design',
  'linux',
  'aws',
  'devops',
  'software_engineering',
  'software_architecture',
  'other',
]

const STATUS_LABELS: Record<LearningStatus, string> = {
  not_started: 'Not started',
  learning: 'Learning',
  practised: 'Practised',
  mastered: 'Mastered',
}

/** Lightweight technical learning hub: topics by category, 4-state progress, resources and notes. */
export function LearningList() {
  const { ready, learningGoalsReady, learningTopics, updateLearningTopic, archiveLearningTopic } =
    useWorkspace()
  const [editing, setEditing] = useState<LearningTopic | null>(null)
  const [creating, setCreating] = useState(false)
  const active = learningTopics.filter((topic) => !topic.archivedAt)
  const groups = CATEGORY_ORDER.map((category) => ({
    category,
    label: CATEGORY_LABELS[category],
    topics: active.filter((topic) => topic.category === category),
  })).filter((group) => group.topics.length)

  if (ready && !learningGoalsReady) return <MissingMigrationBanner />

  return (
    <section className="neo-card rounded-xl p-4 sm:p-5">
      <PanelHeader
        icon={GraduationCap}
        title="Learning"
        subtitle={`${active.length} topic${active.length === 1 ? '' : 's'}`}
      >
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="h-9 shrink-0 rounded-lg bg-primary px-3 text-xs font-medium text-on-primary hover:bg-primary-hover"
        >
          Add topic
        </button>
      </PanelHeader>
      {ready && !active.length && (
        <EmptyState
          icon={GraduationCap}
          title="No topics yet"
          hint="Add a topic to start tracking your learning."
        />
      )}
      <div className="mt-4 space-y-5">
        {groups.map((group) => (
          <div key={group.category}>
            <h3 className="text-xs font-semibold tracking-wide text-ink-3 uppercase">{group.label}</h3>
            <div className="mt-1.5 divide-y divide-line-soft">
              {group.topics.map((topic) => (
                <div key={topic.id} className="group flex items-center gap-2 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-ink">{topic.title}</p>
                    {topic.resources && <p className="truncate text-2xs text-ink-3">{topic.resources}</p>}
                  </div>
                  <select
                    value={topic.status}
                    onChange={(event) =>
                      void updateLearningTopic(topic.id, { status: event.target.value as LearningStatus })
                    }
                    className="h-8 shrink-0 rounded-lg border border-line-strong bg-field px-2 text-xs"
                  >
                    {Object.entries(STATUS_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <div className="flex shrink-0 gap-0.5 opacity-0 group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => setEditing(topic)}
                      className="grid size-7 place-items-center rounded-md text-ink-3 hover:bg-surface-2 hover:text-ink"
                      aria-label={`Edit ${topic.title}`}
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => void archiveLearningTopic(topic.id)}
                      className="grid size-7 place-items-center rounded-md text-ink-3 hover:bg-surface-2 hover:text-ink"
                      aria-label={`Archive ${topic.title}`}
                    >
                      <Archive size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {(creating || editing) && (
        <LearningFormModal
          topic={editing}
          onClose={() => {
            setCreating(false)
            setEditing(null)
          }}
        />
      )}
    </section>
  )
}
