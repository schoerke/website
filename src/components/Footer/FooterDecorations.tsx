/**
 * Decorative yellow circles for footer section.
 * Positioned at bottom of white navigation section to create "rising sun" effect.
 * Circles are clipped by parent's overflow-hidden to show only top ~25%.
 */
const FooterDecorations = () => {
  return (
    <div className="pointer-events-none absolute bottom-0 right-8 flex translate-y-3/4 gap-4 md:right-16 md:gap-6">
      <div className="h-64 w-64 rounded-full bg-primary-yellow md:h-80 md:w-80" aria-hidden="true" />
      <div className="h-64 w-64 rounded-full bg-primary-yellow md:h-80 md:w-80" aria-hidden="true" />
    </div>
  )
}

export default FooterDecorations
