import ArtistMasonryGrid from '@/components/Artist/ArtistMasonryGrid'
import type { HomePageSlide } from '@/components/HomePageSlider/HomePageSlider'
import HomePageSlider from '@/components/HomePageSlider/HomePageSlider'
import SchoerkeLink from '@/components/ui/SchoerkeLink'
// Replaces all homepage CTA links with unified styling and accessibility
import { routing } from '@/i18n/routing'
import { Artist, Image as PayloadImage, Post } from '@/payload-types'
import { getArtistListData } from '@/services/artist'
import { getHomePage } from '@/services/homePage'
import { getDefaultAvatar } from '@/services/media'
import { getPaginatedPosts } from '@/services/post'
import { getTranslations, setRequestLocale } from 'next-intl/server'

type HomePageProps = {
  params: Promise<{ locale: string }>
}

function getPostImageUrl(post: Post, defaultImage: string | null): string {
  const img = typeof post.image === 'object' && post.image !== null ? (post.image as PayloadImage) : null
  if (img?.url && img.url !== 'null' && !img.url.includes('/null')) return img.url
  return defaultImage ?? '/placeholder.jpg'
}

function getPostPath(post: Post): string {
  const isProject = post.categories?.includes('projects')
  const base = isProject ? 'projects' : 'news'
  return `/${base}/${post.slug}`
}

const HomePage = async ({ params }: HomePageProps) => {
  const { locale: localeParam } = await params

  const locale = routing.locales.includes(localeParam as 'de' | 'en')
    ? (localeParam as 'de' | 'en')
    : routing.defaultLocale

  setRequestLocale(locale)

  const t = await getTranslations({ locale, namespace: 'custom.pages.home' })

  const [newsResult, artistsResult, homePageGlobal] = await Promise.all([
    getPaginatedPosts({ category: 'home', locale, publishedOnly: true }),
    getArtistListData(locale),
    getHomePage(locale),
  ])

  const artists = (artistsResult?.docs as Artist[]) || []
  const defaultImage = getDefaultAvatar()

  const newsSlides: HomePageSlide[] = newsResult.docs.map((post) => {
    const img = typeof post.image === 'object' && post.image !== null ? (post.image as PayloadImage) : null
    return {
      src: getPostImageUrl(post, defaultImage),
      alt: post.title,
      title: post.title,
      href: getPostPath(post),
      focalX: img?.focalX ?? null,
      focalY: img?.focalY ?? null,
    }
  })

  return (
    <div className="mx-auto flex max-w-7xl flex-col px-4 py-6 sm:px-6 sm:py-8 lg:p-8">
      {/* News */}
      {newsSlides.length > 0 && (
        <section className="mb-16">
          <h2 className="font-playfair mb-8 text-4xl font-bold sm:text-5xl">{t('newsHeading')}</h2>
          <HomePageSlider slides={newsSlides} interval={9000} />
        </section>
      )}

      {/* Artist Roster */}
      {artists.length > 0 && (
        <section className="mb-16">
          <h2 className="font-playfair mb-4 text-4xl font-bold sm:text-center sm:text-5xl">{t('artistsHeading')}</h2>
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
      <div className="mb-8 flex flex-col gap-16 lg:flex-row">
        {/* Meet the Team */}
        <section className="flex flex-1 flex-col items-start sm:items-center lg:items-center">
          <h2 className="font-playfair mb-4 text-4xl font-bold sm:text-center sm:text-5xl">{t('teamHeading')}</h2>
          <p className="mb-6 text-lg text-gray-600 sm:text-center">
            {typeof homePageGlobal.teamIntro === 'string' && homePageGlobal.teamIntro.trim() !== ''
              ? homePageGlobal.teamIntro
              : t('teamTagline')}
          </p>
          <SchoerkeLink href="/team" variant="animated" className="text-sm font-medium">
            {t('teamCta')}
          </SchoerkeLink>
        </section>

        {/* Contact CTA */}
        <section className="flex flex-1 flex-col items-start sm:items-center lg:items-center">
          <h2 className="font-playfair mb-4 text-4xl font-bold sm:text-center sm:text-5xl">{t('contactHeading')}</h2>
          <p className="mb-6 text-lg text-gray-600 sm:text-center">
            {typeof homePageGlobal.contactIntro === 'string' && homePageGlobal.contactIntro.trim() !== ''
              ? homePageGlobal.contactIntro
              : t('contactTagline')}
          </p>
          <SchoerkeLink href="/kontakt" variant="animated" className="text-sm font-medium">
            {t('contactCta')}
          </SchoerkeLink>
        </section>
      </div>
    </div>
  )
}

export default HomePage
