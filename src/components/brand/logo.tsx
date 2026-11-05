/**
 * The ಆyaama wordmark. Deep indigo on light surfaces; the light version is shown in dark
 * mode (or always, with `onDark`, on deep indigo panels).
 */
export function Logo({
  className = 'h-7',
  onDark = false,
}: {
  className?: string
  onDark?: boolean
}) {
  if (onDark)
    return (
      <img
        src="/brand/logo-light.png"
        alt="ಆyaama"
        className={`w-auto shrink-0 self-start object-contain ${className}`}
      />
    )
  return (
    <>
      <img
        src="/brand/logo.png"
        alt="ಆyaama"
        className={`w-auto shrink-0 self-start object-contain dark:hidden ${className}`}
      />
      <img
        src="/brand/logo-light.png"
        alt="ಆyaama"
        className={`hidden w-auto shrink-0 self-start object-contain dark:block ${className}`}
      />
    </>
  )
}
