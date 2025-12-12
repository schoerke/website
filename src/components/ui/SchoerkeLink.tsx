import { clsx } from 'clsx'
import React from 'react'

interface SchoerkeLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  /**
   * Link style variant
   * - 'animated': Text link with animated yellow underline (default)
   * - 'with-icon': Link with icon, no underline
   * - 'icon-only': Icon-only link, no underline
   */
  variant?: 'animated' | 'with-icon' | 'icon-only'
  children: React.ReactNode
}

/**
 * Standard link component for schoerke.com with consistent styling.
 *
 * Features:
 * - Primary black text with subtle hover dimming
 * - Optional animated yellow underline (emanates from center)
 * - Yellow focus outline for accessibility
 * - External link support (target, rel attributes)
 *
 * @example
 * // Text link with animated underline
 * <SchoerkeLink href="/artists">View Artists</SchoerkeLink>
 *
 * @example
 * // Link with icon (no underline)
 * <SchoerkeLink href="/download.pdf" variant="with-icon">
 *   <Download className="h-4 w-4" />
 *   <span>Download PDF</span>
 * </SchoerkeLink>
 *
 * @example
 * // Icon-only link
 * <SchoerkeLink href="https://facebook.com" variant="icon-only" aria-label="Facebook">
 *   <Facebook className="h-6 w-6" />
 * </SchoerkeLink>
 */
const SchoerkeLink: React.FC<SchoerkeLinkProps> = ({ variant = 'animated', className, children, ...props }) => {
  const baseClasses = 'text-primary-black transition duration-150 ease-in-out hover:text-primary-black/70'

  const focusClasses =
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-yellow'

  const animatedUnderlineClasses =
    'relative after:absolute after:-bottom-1 after:left-1/2 after:h-0.5 after:w-0 after:origin-center after:-translate-x-1/2 after:bg-primary-yellow after:transition-all after:duration-300 hover:after:w-full'

  const variantClasses = {
    animated: animatedUnderlineClasses,
    'with-icon': 'inline-flex items-center gap-2',
    'icon-only': '',
  }

  return (
    <a className={clsx(baseClasses, focusClasses, variantClasses[variant], className)} {...props}>
      {children}
    </a>
  )
}

export default SchoerkeLink
