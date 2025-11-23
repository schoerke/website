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
    // If clicking "all" or clicking the same value, deselect (show all)
    onChange(value === 'all' ? null : value === selected ? null : value)
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
      {roles.map((role) => (
        <ToggleGroupItem key={role} value={role} aria-label={t(role as any)} className="capitalize">
          {t(role as any)}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

export default RoleFilter
