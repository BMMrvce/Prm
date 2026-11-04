import type { WorkspaceTask } from '@/types/workbench'

export function priorityStyle(priority: WorkspaceTask['priority']) {
  if (priority === 'High') return 'bg-[#fde8e8] text-[#a52828]'
  if (priority === 'Medium') return 'bg-[#fff5cf] text-[#8b5e00]'
  return 'bg-[#e4f8ea] text-[#317a4b]'
}

export function noteItems(value: string) {
  return value
    .split('.')
    .map((item) => item.trim())
    .filter(Boolean)
}

export function money(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}
