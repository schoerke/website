'use client'

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/ToggleGroup'
import { useTranslations } from 'next-intl'

type RoleFilterProps = {
  roles: string[]
  selected: string[]
  onChange: (roles: string[]) => void
}

const RoleFilter: React.FC<RoleFilterProps> = ({ roles, selected, onChange }) => {
  const t = useTranslations('custom.recordingRoles')

  const handleValueChange = (values: string[]) => {
    onChange(values)
  }

  return (
    <ToggleGroup
      type="multiple"
      value={selected}
      onValueChange={handleValueChange}
      className="mb-6 flex flex-wrap gap-2"
      aria-label="Filter recordings by role"
    >
      {roles.map((role) => (
        <ToggleGroupItem key={role} value={role} aria-label={t(role as any)} className="capitalize">
          {t(role as any)}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

export default RoleFilter
