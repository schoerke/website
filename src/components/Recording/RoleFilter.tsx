'use client'

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/ToggleGroup'
import { useTranslations } from 'next-intl'

type RoleFilterProps = {
  roles: string[]
  selected: string | null
  onChange: (role: string | null) => void
}

const RoleFilter: React.FC<RoleFilterProps> = ({ roles, selected, onChange }) => {
  const t = useTranslations('custom.recordingRoles')
  const tCommon = useTranslations('common')

  const handleValueChange = (value: string) => {
    // If value is empty (toggle was deselected), show all
    if (!value) {
      onChange(null)
      return
    }
    // If clicking "all", show all
    if (value === 'all') {
      onChange(null)
      return
    }
    // Otherwise, filter by the selected role
    onChange(value)
  }

  return (
    <ToggleGroup
      type="single"
      value={selected || 'all'}
      onValueChange={handleValueChange}
      className="mb-6 flex flex-wrap justify-start gap-2"
      aria-label="Filter recordings by role"
    >
      <ToggleGroupItem key="all" value="all" aria-label={tCommon('all')} className="capitalize">
        {tCommon('all')}
      </ToggleGroupItem>
      {roles.map((role) => {
        const translationKey = role as Parameters<typeof t>[0]
        return (
          <ToggleGroupItem key={role} value={role} aria-label={t(translationKey)} className="capitalize">
            {t(translationKey)}
          </ToggleGroupItem>
        )
      })}
    </ToggleGroup>
  )
}

export default RoleFilter
