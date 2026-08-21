import { Employee } from '@/payload-types'
import { Mail, Phone, Smartphone } from 'lucide-react'
import EmployeeCardShell from './EmployeeCardShell'

interface TeamMemberCardProps extends Employee {
  priority?: boolean
  grayscale?: boolean
}

const buttonClasses = 'flex h-10 w-10 items-center justify-center rounded-full bg-primary-yellow/80'

const TeamMemberCard: React.FC<TeamMemberCardProps> = ({
  name,
  title,
  image,
  email,
  phone,
  mobile,
  priority = false,
  grayscale = false,
}) => {
  const desktopContact = (
    <div className="space-y-2">
      {email && (
        <p>
          <a href={`mailto:${email}`} className="flex items-center gap-2 hover:underline">
            <Mail aria-hidden="true" className="text-primary-yellow h-4 w-4 shrink-0" />
            <span className="break-all">{email}</span>
          </a>
        </p>
      )}
      {phone && (
        <p>
          <a href={`tel:${phone}`} className="flex items-center gap-2 hover:underline">
            <Phone aria-hidden="true" className="text-primary-yellow h-4 w-4 shrink-0" />
            <span>{phone}</span>
          </a>
        </p>
      )}
      {mobile && (
        <p>
          <a href={`tel:${mobile}`} className="flex items-center gap-2 hover:underline">
            <Smartphone aria-hidden="true" className="text-primary-yellow h-4 w-4 shrink-0" />
            <span>{mobile}</span>
          </a>
        </p>
      )}
    </div>
  )

  const mobileButtons = (
    <>
      {email && (
        <a href={`mailto:${email}`} aria-label={email} className={buttonClasses}>
          <Mail aria-hidden="true" className="text-primary-black h-5 w-5" />
        </a>
      )}
      {phone && (
        <a href={`tel:${phone}`} aria-label={phone} className={buttonClasses}>
          <Phone aria-hidden="true" className="text-primary-black h-5 w-5" />
        </a>
      )}
      {mobile && (
        <a href={`tel:${mobile}`} aria-label={mobile} className={buttonClasses}>
          <Smartphone aria-hidden="true" className="text-primary-black h-5 w-5" />
        </a>
      )}
    </>
  )

  return (
    <EmployeeCardShell
      name={name || ''}
      title={title || ''}
      image={image}
      priority={priority}
      grayscale={grayscale}
      mobileContent={mobileButtons}
    >
      {desktopContact}
    </EmployeeCardShell>
  )
}

export default TeamMemberCard
