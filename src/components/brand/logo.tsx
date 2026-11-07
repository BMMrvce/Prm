/**
 * The ಆyaama wordmark, drawn from the single-color logo artwork as a mask so its color
 * comes from the theme: brand indigo in light mode, white in dark mode (`--logo`).
 * `onDark` forces the light variant for the deep brand panel on the login screen.
 * Size it by height (`h-7`); the width follows the artwork's aspect ratio.
 */
export function Logo({
  className = 'h-7',
  onDark = false,
}: {
  className?: string
  onDark?: boolean
}) {
  return (
    <span
      role="img"
      aria-label="ಆyaama"
      className={`brand-logo shrink-0 self-start ${onDark ? 'bg-on-deep' : ''} ${className}`}
    />
  )
}
