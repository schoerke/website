'use client'

import * as React from 'react'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

type InstrumentFilterProps = {
  instruments: string[]
  selected: string[]
  onChange: (instruments: string[]) => void
}

const InstrumentFilter: React.FC<InstrumentFilterProps> = ({ instruments, selected, onChange }) => {
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
        <ToggleGroupItem
          key={instrument}
          value={instrument}
          aria-label={instrument}
          className="capitalize"
        >
          {instrument}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

export default InstrumentFilter
