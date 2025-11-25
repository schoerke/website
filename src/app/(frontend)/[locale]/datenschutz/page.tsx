import PayloadRichText from '@/components/ui/PayloadRichText'
import { getPageBySlug } from '@/services/page'
import { notFound } from 'next/navigation'

const DatenschutzPage = async () => {
  const page = await getPageBySlug('datenschutz', 'de')

  if (!page) {
    notFound()
  }

  return (
    <main className="mx-auto flex max-w-7xl flex-col px-4 py-12 sm:px-6 lg:p-8">
      <h1 className="font-playfair mb-12 mt-4 text-5xl font-bold">{page.title}</h1>
      <div className="prose max-w-none">
        <PayloadRichText content={page.content} />
      </div>
    </main>
  )
}

export default DatenschutzPage
