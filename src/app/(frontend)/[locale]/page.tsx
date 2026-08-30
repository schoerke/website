import ArtistMasonryGrid from '@/components/Artist/ArtistMasonryGrid'
import HomePageSidebar from '@/components/HomePageSidebar/HomePageSidebar'
import type { HomePageSlide } from '@/components/HomePageSlider/HomePageSlider'
import HomePageSlider from '@/components/HomePageSlider/HomePageSlider'
import SchoerkeLink from '@/components/ui/SchoerkeLink'
import SectionHeading from '@/components/ui/SectionHeading'
import { routing } from '@/i18n/routing'
import { Artist, Post } from '@/payload-types'
import { getValidImageUrl } from '@/utils/image'
import { getArtistListData } from '@/services/artist'
import { getHomePage } from '@/services/homePage'
import { getPaginatedPosts } from '@/services/post'
import { getTranslations, setRequestLocale } from 'next-intl/server'

// Fallback TTL — on-demand revalidation via Payload hooks is the primary mechanism
export const revalidate = 3600

type HomePageProps = {
  params: Promise<{ locale: string }>
}

function getPostImageUrl(post: Post): string | null {
  return getValidImageUrl(post.image)
}

function getPostPath(post: Post): HomePageSlide['destination'] {
  const isProject = post.categories?.includes('projects')
  return isProject
    ? { type: 'internal', href: { pathname: '/projects/[slug]', params: { slug: post.slug } } }
    : { type: 'internal', href: { pathname: '/news/[slug]', params: { slug: post.slug } } }
}

const HomePage = async ({ params }: HomePageProps) => {
  const { locale: localeParam } = await params

  const locale = routing.locales.includes(localeParam as 'de' | 'en')
    ? (localeParam as 'de' | 'en')
    : routing.defaultLocale

  setRequestLocale(locale)

  const kontaktPathname = routing.pathnames['/kontakt']
  const contactSlug = typeof kontaktPathname === 'string' ? kontaktPathname : kontaktPathname[locale]
  const t = await getTranslations({ locale, namespace: 'custom.pages.home' })

  const [newsResult, artistsResult, homePageGlobal] = await Promise.all([
    getPaginatedPosts({
      category: 'home',
      locale,
      publishedOnly: true,
      limit: 10,
      select: { title: true, slug: true, image: true, categories: true },
    }),
    getArtistListData(locale),
    getHomePage(locale),
  ])

  const artists = (artistsResult?.docs as Artist[]) || []

  const newsSlides: HomePageSlide[] = newsResult.docs.map((post) => {
    const img = typeof post.image === 'object' && post.image !== null ? post.image : null
    return {
      src: getPostImageUrl(post),
      alt: post.title,
      title: post.title,
      destination: getPostPath(post),
      focalX: img?.focalX ?? null,
      focalY: img?.focalY ?? null,
    }
  })

  return (
    <div className="mx-auto flex max-w-7xl flex-col px-4 py-6 sm:px-6 sm:py-8 lg:p-8">
      {/* News */}
      {newsSlides.length > 0 && (
        <section className="mb-16">
          <SectionHeading className="mb-8">{t('newsHeading')}</SectionHeading>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[75fr_25fr]">
            <HomePageSlider slides={newsSlides} interval={9000} />
            <HomePageSidebar locale={locale} />
          </div>
        </section>
      )}

      {/* Artist Roster */}
      {artists.length > 0 && (
        <section className="mb-16">
          <SectionHeading className="mb-4 sm:justify-center">{t('artistsHeading')}</SectionHeading>
          <p className="mb-6 text-lg text-gray-600 sm:text-center">
            {typeof homePageGlobal.artistsIntro === 'string' && homePageGlobal.artistsIntro.trim() !== ''
              ? homePageGlobal.artistsIntro
              : t('artistsBlurb')}
          </p>

          {/* Tablet and up: masonry grid */}
          <div className="hidden sm:block">
            <ArtistMasonryGrid artists={artists} />
          </div>
          <div className="mt-6 sm:hidden">
            <SchoerkeLink href="/artists" variant="animated" className="text-sm font-medium">
              {t('artistsCta')}
            </SchoerkeLink>
          </div>
        </section>
      )}

      {/* Meet the Team + Contact CTA — stacked, 2-col at lg */}
      <div className="flex flex-col gap-16 lg:flex-row">
        {/* Meet the Team */}
        <section className="flex flex-1 flex-col items-start sm:items-center lg:items-center">
          <SectionHeading className="mb-4 sm:justify-center">{t('teamHeading')}</SectionHeading>
          <p className="mb-6 text-lg text-gray-600 sm:text-center">
            {typeof homePageGlobal.teamIntro === 'string' && homePageGlobal.teamIntro.trim() !== ''
              ? homePageGlobal.teamIntro
              : t('teamTagline')}
          </p>
          {/* #team must match the id of the "Meet the Team" section on the Kontakt/Contact page */}
          <SchoerkeLink href={`${contactSlug}#team`} variant="animated" className="text-sm font-medium">
            {t('teamCta')}
          </SchoerkeLink>
        </section>

        {/* Contact CTA */}
        <section className="flex flex-1 flex-col items-start sm:items-center lg:items-center">
          <SectionHeading className="mb-4 sm:justify-center">{t('contactHeading')}</SectionHeading>
          <p className="mb-6 text-lg text-gray-600 sm:text-center">
            {typeof homePageGlobal.contactIntro === 'string' && homePageGlobal.contactIntro.trim() !== ''
              ? homePageGlobal.contactIntro
              : t('contactTagline')}
          </p>
          {/* next-intl's Link translates /kontakt → /contact for English automatically (no hash needed) */}
          <SchoerkeLink href="/kontakt" variant="animated" className="text-sm font-medium">
            {t('contactCta')}
          </SchoerkeLink>
        </section>
      </div>
    </div>
  )
}

export default HomePage
