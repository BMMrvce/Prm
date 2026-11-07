import { Check } from 'lucide-react'

export function SquareCheck({
  checked,
  onClick,
  label,
}: {
  checked: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`grid size-[18px] shrink-0 place-items-center rounded-[5px] border text-on-primary ${
        checked ? 'border-primary bg-primary' : 'border-line-strong bg-field hover:border-primary'
      }`}
      aria-label={label}
    >
      {checked && <Check size={12} strokeWidth={3} />}
    </button>
  )
}
