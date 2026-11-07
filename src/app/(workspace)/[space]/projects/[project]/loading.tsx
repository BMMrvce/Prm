/** Shown instantly while a project page (rendered on demand) loads. */
export default function ProjectLoading() {
  return (
    <div className="mt-5 space-y-4" aria-busy="true" aria-label="Loading project">
      <div className="neo-card h-[132px] animate-pulse rounded-xl" />
      <div className="neo-card h-[320px] animate-pulse rounded-xl" />
    </div>
  )
}
