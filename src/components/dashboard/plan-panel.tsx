'use client'

import { SquareCheck } from '@/components/ui/square-check'
import { useWorkspace } from '@/state/workbench-store'

export function PlanPanel() {
  const { workspace, plan, togglePlan } = useWorkspace()
  return (
    <section className="neo-card min-h-[330px] rounded-xl p-4">
      <h2 className="text-[15px] font-semibold">Plan of Action</h2>
      <div className="mt-4 space-y-5">
        {workspace.plan.map((item, index) => (
          <div className="flex items-center gap-3" key={item}>
            <SquareCheck
              checked={plan[index]}
              onClick={() => togglePlan(index)}
              label={`Complete ${item}`}
            />
            <span className={`text-[14px] ${plan[index] ? 'text-[#77777d] line-through' : ''}`}>
              {index + 1}. {item}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
