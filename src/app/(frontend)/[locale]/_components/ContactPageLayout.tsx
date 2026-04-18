import TeamMemberCard from '@/components/Employee/TeamMemberCard'
import PayloadRichText from '@/components/ui/PayloadRichText'
import type { Employee, Page, Image as PayloadImage } from '@/payload-types'
import Image from 'next/image'
import React from 'react'

interface ContactPageLayoutProps {
  page: Page
  locale: string
  image?: PayloadImage | null
  teamPage?: Page | null
  employees?: Employee[]
  phoneLabel?: string
  mobileLabel?: string
}

const ContactPageLayout: React.FC<ContactPageLayoutProps> = ({
  page,
  locale,
  image,
  teamPage,
  employees,
  phoneLabel = 'Phone',
  mobileLabel = 'Mobile',
}) => {
  return (
    <div className="mx-auto flex max-w-7xl flex-col px-4 py-12 sm:px-6 lg:p-8">
      <h1 className="font-playfair mb-12 mt-4 text-5xl font-bold sm:text-6xl lg:text-7xl">{page.title}</h1>
      <div className="flex flex-col gap-8 md:flex-row md:items-start md:gap-8 lg:gap-12">
        <div className="prose max-w-none md:w-1/2">
          <PayloadRichText content={page.content} locale={locale} />
        </div>
        {image && (
          <div className="mb-0 md:mb-0 md:w-1/2">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg">
              <Image
                src={image.url || ''}
                alt={image.alt || 'Wiesbaden, Germany'}
                fill
                className="object-cover"
                sizes="(min-width: 768px) 50vw, 100vw"
                priority
              />
            </div>
          </div>
        )}
      </div>

      {/* Team section — shown when employees are available */}
      {employees && employees.length > 0 && (
        <div className="mt-16">
          {teamPage && (
            <div className="mb-8">
              <h2 id="team" className="font-playfair mb-6 text-4xl font-bold sm:text-5xl lg:text-6xl">
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
