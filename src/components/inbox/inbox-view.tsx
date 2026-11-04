import type { WorkspaceData } from '@/types/workbench'

const messages = [
  'Please review the latest proposal',
  'Meeting notes and next steps',
  'Invoice ready for approval',
  'You were mentioned in a task',
]

export function InboxView({ workspace }: { workspace: WorkspaceData }) {
  const provider = workspace.mailProvider
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <section className="neo-card overflow-hidden rounded-xl">
        <div className="border-b border-[#e4e4e7] px-5 py-4">
          <h3 className="font-semibold">Unified inbox</h3>
          <p className="text-xs text-[#73737a]">{provider} and workspace updates</p>
        </div>
        {messages.map((message, index) => (
          <button
            className="flex w-full gap-3 border-b border-[#eeeeef] px-5 py-4 text-left hover:bg-[#fafaff]"
            key={message}
          >
            <span
              className={`mt-1 size-2 rounded-full ${index < 2 ? 'bg-[#493bd0]' : 'bg-[#c7c7cc]'}`}
            />
            <div>
              <p className="text-sm font-medium">{message}</p>
              <p className="mt-1 text-xs text-[#77777d]">
                {provider} · {index + 1}h ago
              </p>
            </div>
          </button>
        ))}
      </section>
      <section className="neo-card rounded-xl p-5">
        <h3 className="font-semibold">Connected mailbox</h3>
        <div className="mt-4 rounded-lg border border-[#e4e4e7] p-4">
          <p className="text-sm font-medium">{provider}</p>
          <p className="mt-1 text-xs text-[#77777d]">Configured for {workspace.switchLabel}</p>
          <span className="mt-3 inline-flex rounded-full bg-[#e6f7ea] px-2 py-1 text-[10px] font-medium text-[#2f7045]">
            Ready to connect
          </span>
        </div>
      </section>
    </div>
  )
}
