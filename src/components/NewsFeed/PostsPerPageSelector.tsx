'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { useTranslations } from 'next-intl'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'

/**
 * Props for the PostsPerPageSelector component
 */
interface PostsPerPageSelectorProps {
  /** Current number of posts displayed per page */
  currentLimit: number
  /** Available options for posts per page. Defaults to [10, 25, 50] */
  options?: number[]
}

/**
 * Posts Per Page Selector Component
 *
 * Allows users to change the number of posts displayed per page.
 * When the limit changes, automatically resets to page 1 and navigates.
 * Shows loading state during navigation using React's useTransition.
 *
 * @example
 * ```tsx
 * <PostsPerPageSelector currentLimit={25} options={[10, 25, 50]} />
 * ```
 */
const PostsPerPageSelector: React.FC<PostsPerPageSelectorProps> = ({ currentLimit, options = [10, 25, 50] }) => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const t = useTranslations('custom.pagination')
  const [isPending, startTransition] = useTransition()

  const handleChange = (value: string): void => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('limit', value)
    params.set('page', '1') // Reset to page 1 when changing limit

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`)
    })
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-600">{t('postsPerPage')}:</span>
      <Select value={currentLimit.toString()} onValueChange={handleChange} disabled={isPending}>
        <SelectTrigger className="w-20">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option.toString()}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export default PostsPerPageSelector
