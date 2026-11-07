/** Intrinsic size of public/brand/logo.png and logo-dark.png (both made from src/assets/logo.png). */
const WIDTH = 1251
const HEIGHT = 324
const ALT = 'ಸ(kala)²'

/**
 * The full-color brand logo. Light mode shows the navy original; dark mode shows the
 * variant with the navy turned white (blue accents kept). The page's `dark` class picks
 * the image, so the right one shows from the first paint. `onDark` always uses the dark
 * variant (for the deep brand panel on the login screen). Size it by height (`h-7`);
 * the width follows the artwork.
 */
export function Logo({
  className = 'h-7',
  onDark = false,
}: {
  className?: string
  onDark?: boolean
}) {
  const image = (src: string, visibility: string) => (
    /* eslint-disable-next-line @next/next/no-img-element -- static brand artwork */
    <img
      src={src}
      alt={ALT}
      width={WIDTH}
      height={HEIGHT}
      draggable={false}
      className={`w-auto shrink-0 select-none self-start object-contain ${visibility} ${className}`}
    />
  )
  if (onDark) return image('/brand/logo-dark.png', '')
  return (
    <>
      {image('/brand/logo.png', 'dark:hidden')}
      {image('/brand/logo-dark.png', 'hidden dark:block')}
    </>
  )
}
