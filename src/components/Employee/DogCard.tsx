import type { Image as PayloadImage } from '@/payload-types'
import { Bone } from 'lucide-react'
import EmployeeCardShell from './EmployeeCardShell'

interface DogCardProps {
  image?: PayloadImage | null
  name?: string
  title?: string
  woofLabel?: string
}

const DogCard: React.FC<DogCardProps> = ({ image, name = 'Yuki', title = 'Office Dog', woofLabel = 'Woof!' }) => {
  return (
    <EmployeeCardShell name={name} title={title} image={image} grayscale hasHoverContent>
      <div className="flex items-center gap-2">
        <Bone aria-hidden="true" className="text-primary-yellow h-4 w-4 shrink-0" />
        <span>{woofLabel}</span>
      </div>
    </EmployeeCardShell>
  )
}

export default DogCard
