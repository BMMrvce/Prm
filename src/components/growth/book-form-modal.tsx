'use client'

import { Star } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Modal, fieldClass, labelClass } from '@/components/ui/modal'
import { useWorkspace } from '@/state/workbench-store'
import type { Book, BookStatus } from '@/types/workbench'

const textareaClass =
  'mt-1 w-full rounded-lg border border-line-strong bg-field p-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20'

/** Add a book, or edit/remove an existing one — including its cover, rating and knowledge extraction. */
export function BookFormModal({ book, onClose }: { book: Book | null; onClose: () => void }) {
  const { addBook, updateBook, deleteBook } = useWorkspace()
  const [title, setTitle] = useState(book?.title ?? '')
  const [author, setAuthor] = useState(book?.author ?? '')
  const [status, setStatus] = useState<BookStatus>(book?.status ?? 'planned')
  const [totalPages, setTotalPages] = useState(book?.totalPages ?? 0)
  const [coverUrl, setCoverUrl] = useState(book?.coverUrl ?? '')
  const [category, setCategory] = useState(book?.category ?? '')
  const [pagesPerDayGoal, setPagesPerDayGoal] = useState(book?.pagesPerDayGoal ?? 0)
  const [rating, setRating] = useState(book?.rating ?? 0)
  const [learned, setLearned] = useState(book?.learned ?? '')
  const [interesting, setInteresting] = useState(book?.interesting ?? '')
  const [apply, setApply] = useState(book?.apply ?? '')
  const [action, setAction] = useState(book?.action ?? '')
  const [saving, setSaving] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const text = title.trim()
    if (!text) return
    setSaving(true)
    const base = {
      title: text,
      author: author.trim(),
      status,
      totalPages: totalPages || null,
      coverUrl: coverUrl.trim() || null,
      category: category.trim() || null,
      pagesPerDayGoal: pagesPerDayGoal || null,
    }
    const ok = book
      ? await updateBook(book.id, {
          ...base,
          rating: rating || null,
          learned: learned.trim() || null,
          interesting: interesting.trim() || null,
          apply: apply.trim() || null,
          action: action.trim() || null,
        })
      : await addBook(base)
    setSaving(false)
    if (ok) onClose()
  }

  const remove = async () => {
    if (!book) return
    setSaving(true)
    const ok = await deleteBook(book.id)
    setSaving(false)
    if (ok) onClose()
  }

  return (
    <Modal title={book ? 'Edit book' : 'Add book'} onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-[88px_1fr] gap-3">
          <div>
            <label className={labelClass}>Cover URL</label>
            <div className="mt-1 flex h-24 w-[72px] items-center justify-center overflow-hidden rounded-md border border-line-strong bg-surface-2">
              {coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- arbitrary external cover URLs
                <img src={coverUrl} alt="" className="size-full object-cover" />
              ) : (
                <span className="text-2xs text-ink-3">No cover</span>
              )}
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <label className={labelClass}>Title</label>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className={`${fieldClass} mt-1`}
                autoFocus
                required
              />
            </div>
            <div>
              <label className={labelClass}>Author</label>
              <input
                value={author}
                onChange={(event) => setAuthor(event.target.value)}
                className={`${fieldClass} mt-1`}
              />
            </div>
            <div>
              <label className={labelClass}>Cover image URL (optional)</label>
              <input
                value={coverUrl}
                onChange={(event) => setCoverUrl(event.target.value)}
                placeholder="https://..."
                className={`${fieldClass} mt-1`}
              />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <label className={labelClass}>Status</label>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as BookStatus)}
              className={`${fieldClass} mt-1`}
            >
              <option value="planned">Planned</option>
              <option value="reading">Reading</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Category</label>
            <input
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              placeholder="Business, fiction..."
              className={`${fieldClass} mt-1`}
            />
          </div>
          <div>
            <label className={labelClass}>Total pages</label>
            <input
              type="number"
              min={0}
              value={totalPages}
              onChange={(event) => setTotalPages(Number(event.target.value))}
              className={`${fieldClass} mt-1`}
            />
          </div>
          <div>
            <label className={labelClass}>Goal (pages/day)</label>
            <input
              type="number"
              min={0}
              value={pagesPerDayGoal}
              onChange={(event) => setPagesPerDayGoal(Number(event.target.value))}
              className={`${fieldClass} mt-1`}
            />
          </div>
        </div>

        {book && (
          <>
            <div>
              <label className={labelClass}>Your rating</label>
              <div className="mt-1.5 flex gap-1">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRating(rating === value ? 0 : value)}
                    className="grid size-8 place-items-center rounded-md text-ink-3 hover:bg-surface-2"
                    aria-label={`Rate ${value} star${value === 1 ? '' : 's'}`}
                    aria-pressed={rating >= value}
                  >
                    <Star
                      size={16}
                      className={rating >= value ? 'fill-warning-ink text-warning-ink' : ''}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-xs font-semibold tracking-wide text-ink-3 uppercase">Knowledge extraction</h3>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>What did I learn?</label>
                  <textarea
                    value={learned}
                    onChange={(event) => setLearned(event.target.value)}
                    rows={2}
                    className={textareaClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>What was interesting?</label>
                  <textarea
                    value={interesting}
                    onChange={(event) => setInteresting(event.target.value)}
                    rows={2}
                    className={textareaClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>How can I apply it?</label>
                  <textarea
                    value={apply}
                    onChange={(event) => setApply(event.target.value)}
                    rows={2}
                    className={textareaClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>What action will I take?</label>
                  <textarea
                    value={action}
                    onChange={(event) => setAction(event.target.value)}
                    rows={2}
                    className={textareaClass}
                  />
                </div>
              </div>
            </div>
          </>
        )}

        <div className="flex items-center justify-between gap-2 pt-2">
          {book ? (
            <button type="button" onClick={remove} className="text-xs text-error-ink hover:underline">
              Remove book
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 rounded-lg px-3 text-sm text-ink-2 hover:bg-surface-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="h-9 rounded-lg bg-primary px-4 text-sm font-medium text-on-primary hover:bg-primary-hover disabled:opacity-60"
            >
              {book ? 'Save changes' : 'Add book'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
