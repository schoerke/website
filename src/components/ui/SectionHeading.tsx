interface SectionHeadingProps {
  children: React.ReactNode
  className?: string
}

/**
 * Section heading label — a short yellow rule followed by a small, bold,
 * uppercase, letter-spaced title. Used for homepage section headers.
 *
 * @example
 * <SectionHeading>{t('newsHeading')}</SectionHeading>
 *
 * @example
 * // Centered on larger screens
 * <SectionHeading className="sm:justify-center">{t('teamHeading')}</SectionHeading>
 */
const SectionHeading: React.FC<SectionHeadingProps> = ({ children, className = '' }) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <span aria-hidden="true" className="bg-primary-yellow h-0.5 w-10 shrink-0" />
      <h2 className="text-primary-black text-lg font-bold uppercase tracking-widest sm:text-xl">{children}</h2>
    </div>
  )
}

export default SectionHeading
