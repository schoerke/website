import { Employee, Media } from '@/payload-types'
import config from '@payload-config'
import Image from 'next/image'
import { getPayload } from 'payload'

// This page will be dynamically rendered
export const dynamic = 'force-dynamic'

const TeamMemberCard: React.FC<Employee> = ({ name, title, image }) => {
  const img = image as Media

  return (
    <div className="overflow-hidden rounded-lg bg-white shadow-md transition-transform hover:scale-[1.02]">
      <div className="h-72 w-full">
        <Image
          src={img?.url}
          alt={name || 'Team member'}
          width={400}
          height={400}
          className="h-full w-full object-cover"
        />
      </div>
      <div className="p-6">
        <h3 className="font-playfair mb-2 text-2xl font-bold">{name}</h3>
        <p className="text-primary mb-3 text-sm font-medium">{title}</p>
      </div>
    </div>
  )
}

const TeamPage = async () => {
  const payload = await getPayload({ config })
  const { docs: employees } = await payload.find({
    collection: 'employees',
    sort: 'order',
  })

  return (
    <main className="mx-auto flex max-w-7xl flex-col px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <h1 className="font-playfair mt-4 mb-12 text-5xl font-bold">Team</h1>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {employees.map((employee: Employee) => (
          <TeamMemberCard key={employee.name} {...employee} />
        ))}
      </div>
    </main>
  )
}

export default TeamPage
