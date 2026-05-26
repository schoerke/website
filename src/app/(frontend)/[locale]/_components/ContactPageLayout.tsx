import TeamMemberCard from '@/components/Employee/TeamMemberCard'
import ContactPageSidebar from '@/components/ContactPageSidebar/ContactPageSidebar'
import PayloadRichText from '@/components/ui/PayloadRichText'
import type { Employee, Page, Image as PayloadImage } from '@/payload-types'
import Image from 'next/image'
import React from 'react'

interface ContactPageLayoutProps {
  title: string
  locale: 'de' | 'en'
  image?: PayloadImage | null
  teamPage?: Page | null
  employees?: Employee[]
  phoneLabel?: string
  mobileLabel?: string
}

const ContactPageLayout: React.FC<ContactPageLayoutProps> = ({
  title,
  locale,
  image,
  teamPage,
  employees,
  phoneLabel = 'Phone',
  mobileLabel = 'Mobile',
}) => {
  return (
    <div className="mx-auto flex max-w-7xl flex-col px-4 py-6 sm:px-6 sm:py-8 lg:p-8">
      <h1 className="font-playfair mb-8 text-4xl font-bold sm:text-5xl">{title}</h1>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[75fr_25fr] lg:items-start">
        <ContactPageSidebar />
        {image && (
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg lg:order-first">{/* lg:order-first: sidebar is first in DOM (shows above image on mobile); image moves to left column on desktop */}
            <Image
              src={image.url || ''}
              alt={image.alt || 'Wiesbaden, Germany'}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 75vw"
              priority
            />
          </div>
        )}
      </div>

      {/* Team section — shown when employees are available */}
      {employees && employees.length > 0 && (
        <div className="mt-16">
          {teamPage && (
            <div className="mb-8">
              <h2 id="team" className="font-playfair mb-6 text-4xl font-bold sm:text-5xl">
                {teamPage.title}
              </h2>
              <div className="prose max-w-none">
                <PayloadRichText content={teamPage.content} locale={locale} />
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {employees.map((employee, index) => (
              <TeamMemberCard
                key={employee.id}
                {...employee}
                phoneLabel={phoneLabel}
                mobileLabel={mobileLabel}
                priority={index === 0}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default ContactPageLayout
