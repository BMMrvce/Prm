import { CheckCircle2, Inbox } from 'lucide-react'
import type { WorkspaceData } from '@/types/workbench'

export function IntegrationsList({ workspace }: { workspace: WorkspaceData }) {
  const integrations = [
    [workspace.mailProvider, 'Mail and sending'],
    ['Google Calendar', 'Two-way calendar sync'],
    ['Slack', 'Mentions and task creation'],
    ['GitHub', 'Pull requests and status'],
  ]
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {integrations.map(([name, detail], index) => (
        <div className="neo-card flex items-center gap-4 rounded-xl p-5" key={name}>
          <span className="grid size-10 place-items-center rounded-lg bg-[#eeedff] text-[#493bd0]">
            {index === 0 ? <Inbox size={19} /> : <CheckCircle2 size={19} />}
          </span>
          <div className="flex-1">
            <h3 className="text-sm font-semibold">{name}</h3>
            <p className="mt-1 text-xs text-[#77777d]">{detail}</p>
          </div>
          <button className="rounded-lg border border-[#d8d8dc] bg-white px-3 py-2 text-xs font-medium">
            {index === 0 ? 'Configure' : 'Connect'}
          </button>
        </div>
      ))}
    </div>
  )
}
