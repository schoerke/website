import { Link } from '@/i18n/navigation'
import { clsx } from 'clsx'
import type { ComponentProps } from 'react'
import React from 'react'

type NextIntlLinkProps = ComponentProps<typeof Link>

interface SchoerkeLinkProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  /**
   * Link style variant
   * - 'animated': Text link with animated yellow underline (default)
   * - 'with-icon': Link with icon, no underline
   * - 'icon-only': Icon-only link, no underline
   */
  variant?: 'animated' | 'with-icon' | 'icon-only'
  /**
   * Link destination. Internal links (starting with /) use Next.js Link,
   * external links use native anchor tags.
   */
  href: string
  children: React.ReactNode
}

function isInternalLink(href: string): boolean {
  return href.startsWith('/')
}

/**
 * Standard link component with consistent styling.
 *
 * Features:
 * - Automatically detects internal vs external links
 * - Internal links use Next.js Link for client-side navigation
 * - External links use native anchor tags
 * - Primary black text with subtle hover dimming
 * - Optional animated yellow underline (emanates from center)
 * - Yellow focus outline for accessibility
 *
 * @example
 * // Internal link with animated underline
 * <SchoerkeLink href="/artists">View Artists</SchoerkeLink>
 *
 * @example
 * // External link with icon (no underline)
 * <SchoerkeLink href="https://example.com/download.pdf" variant="with-icon">
 *   <Download className="h-4 w-4" />
 *   <span>Download PDF</span>
 * </SchoerkeLink>
 *
 * @example
 * // Icon-only external link
 * <SchoerkeLink href="https://facebook.com" variant="icon-only" aria-label="Facebook">
 *   <Facebook className="h-6 w-6" />
 * </SchoerkeLink>
 */
const SchoerkeLink: React.FC<SchoerkeLinkProps> = ({ variant = 'animated', className, href, children, ...props }) => {
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

  const combinedClasses = clsx(baseClasses, focusClasses, variantClasses[variant], className)

  // Use Next.js Link for internal navigation
  if (isInternalLink(href)) {
    return (
      <Link href={href as NextIntlLinkProps['href']} className={combinedClasses} {...props}>
        {children}
      </Link>
    )
  }

  // Use native anchor tag for external links
  return (
    <a href={href} className={combinedClasses} {...props}>
      {children}
    </a>
  )
}

export default SchoerkeLink
