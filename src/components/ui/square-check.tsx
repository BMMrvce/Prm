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
      className={`grid size-[17px] shrink-0 place-items-center rounded-[2px] border text-white ${
        checked ? 'border-[#4a3fd1] bg-[#4a3fd1]' : 'border-[#858585] bg-white'
      }`}
      aria-label={label}
    >
      {checked && <Check size={12} strokeWidth={3} />}
    </button>
  )
}
