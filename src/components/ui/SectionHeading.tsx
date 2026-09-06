interface SectionHeadingProps {
  children: React.ReactNode
  className?: string
  size?: 'default' | 'small'
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
 *
 * @example
 * // Smaller variant for tight spaces (e.g. sidebar)
 * <SectionHeading size="small">{t('artistLinks.heading')}</SectionHeading>
 */
const SectionHeading: React.FC<SectionHeadingProps> = ({ children, className = '', size = 'default' }) => {
  return (
    <div className={`flex items-center ${size === 'small' ? 'gap-2' : 'gap-3'} ${className}`}>
      <span aria-hidden="true" className={`bg-primary-yellow h-0.5 shrink-0 ${size === 'small' ? 'w-6' : 'w-10'}`} />
      <h2
        className={`text-primary-black min-w-0 font-bold uppercase tracking-widest ${
          size === 'small' ? 'whitespace-nowrap text-xs tracking-[0.12em]' : 'text-lg sm:text-xl'
        }`}
      >
        {children}
      </h2>
    </div>
  )
}

export default SectionHeading
