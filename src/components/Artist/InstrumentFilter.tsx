'use client'

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/ToggleGroup'
import { useTranslations } from 'next-intl'

type InstrumentFilterProps = {
  instruments: string[]
  selected: string[]
  onChange: (instruments: string[]) => void
}

const InstrumentFilter: React.FC<InstrumentFilterProps> = ({ instruments, selected, onChange }) => {
  const t = useTranslations('custom.instruments')

  // Multi-select: value is array, onValueChange gives array
  const handleValueChange = (values: string[]) => {
    onChange(values)
  }

  return (
    <ToggleGroup
      type="multiple"
      value={selected}
      onValueChange={handleValueChange}
      className="mb-6 flex flex-wrap gap-2"
      aria-label="Filter artists by instrument"
    >
      {instruments.map((instrument) => (
        <ToggleGroupItem key={instrument} value={instrument} aria-label={t(instrument as any)} className="capitalize">
          {t(instrument as any)}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

export default InstrumentFilter
