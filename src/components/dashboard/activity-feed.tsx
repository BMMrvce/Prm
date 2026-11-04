import type { WorkspaceData } from '@/types/workbench'

export function ActivityFeed({ workspace }: { workspace: WorkspaceData }) {
  return (
    <section className="neo-card min-h-[330px] rounded-xl p-4">
      <h2 className="text-[15px] font-semibold">What’s Cooking</h2>
      <div className="mt-4 space-y-3">
        {workspace.activity.map((item) => (
          <p className="text-[13px] leading-5 text-[#66666c]" key={item}>
            {item}
          </p>
        ))}
      </div>
    </section>
  )
}
