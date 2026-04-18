import { Employee, Image as PayloadImage } from '@/payload-types'
import Image from 'next/image'
import React from 'react'

interface TeamMemberCardProps extends Employee {
  phoneLabel: string
  mobileLabel: string
  priority?: boolean
}

const TeamMemberCard: React.FC<TeamMemberCardProps> = ({
  name,
  title,
  image,
  email,
  phone,
  mobile,
  phoneLabel,
  mobileLabel,
  priority = false,
}) => {
  const img = typeof image === 'object' && image !== null ? (image as PayloadImage) : undefined
  const imageUrl = img?.url || '/placeholder.jpg'

  return (
    <div className="group overflow-hidden rounded-lg bg-white shadow-md transition-transform hover:scale-[1.02]">
      <div className="relative h-72 w-full">
        <Image
          src={imageUrl}
          alt={name || 'Team Member'}
          width={400}
          height={400}
          className="h-full w-full object-cover"
          priority={priority}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-white/10 transition-opacity duration-300 group-hover:opacity-0"
        ></div>
      </div>
      <div className="p-6">
        <h3 className="font-playfair mb-2 text-3xl font-bold">{name}</h3>
        <p className="font-playfair mb-3 text-xl">{title}</p>
        {email && (
          <p className="mb-2 text-sm">
            <a href={`mailto:${email}`} className="hover:underline">
              {email}
            </a>
          </p>
        )}
        {phone && (
          <p className="text-xs">
            <a href={`tel:${phone}`} className="hover:underline">
              {phoneLabel}: {phone}
            </a>
          </p>
        )}
        {mobile && (
          <p className="text-xs">
            <a href={`tel:${mobile}`} className="hover:underline">
              {mobileLabel}: {mobile}
            </a>
          </p>
        )}
      </div>
    </div>
  )
}

export default TeamMemberCard
