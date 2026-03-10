/**
 * Common media asset paths served from Vercel Blob via Payload CMS.
 * These assets were uploaded to the database and are now served through the API.
 */

/**
 * Payload API path for the full logo image (logo.png).
 * @example <Image src={LOGO_PATH} alt="Logo" />
 */
export const LOGO_PATH = '/api/images/file/logo.png'

/**
 * Payload API path for the logo icon image (logo_icon.png).
 * Typically used for smaller logo representations in headers, footers, or favicons.
 * @example <Image src={LOGO_ICON_PATH} alt="Logo" width={40} height={40} />
 */
export const LOGO_ICON_PATH = '/api/images/file/logo_icon.png'

/**
 * Payload API path for the default avatar image (default-avatar.webp).
 * Used as a fallback image when an employee or artist doesn't have a specific photo.
 * @example <Image src={DEFAULT_AVATAR_PATH} alt="Default Avatar" />
 */
export const DEFAULT_AVATAR_PATH = '/api/images/file/default-avatar.webp'

/**
 * @deprecated Use LOGO_PATH constant instead
 */
export const getLogo = (): string => LOGO_PATH

/**
 * @deprecated Use LOGO_ICON_PATH constant instead
 */
export const getLogoIcon = (): string => LOGO_ICON_PATH

/**
 * @deprecated Use DEFAULT_AVATAR_PATH constant instead
 */
export const getDefaultAvatar = (): string => DEFAULT_AVATAR_PATH
