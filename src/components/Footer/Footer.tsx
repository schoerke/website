import FooterDecorations from '@/components/Footer/FooterDecorations'
import FooterInfo from '@/components/Footer/FooterInfo'
import FooterNavigation from '@/components/Footer/FooterNavigation'
import { getImageByFilename } from '@/services/media.server'
import { getValidImageUrl } from '@/utils/image'
import Image from 'next/image'

type FooterProps = {
  locale: string
}

const Footer = async ({ locale }: FooterProps) => {
  // The contact page's hero image ("wiesbaden.webp") is otherwise only requested once the
  // Contact page itself mounts, i.e. after navigation completes. The Footer renders on every
  // page and links to Contact, so we preload the same image here (same src/sizes/quality as
  // ContactPageLayout's <ImageWithSkeleton>) via an invisible, eager-loaded <Image> — Next.js
  // generates an identical responsive srcset/URL for matching props, so this warms the browser's
  // cache with the exact bytes the Contact page will request, making it feel instantly loaded.
  //
  // Deliberately NOT `priority`: that would also mark this `fetchPriority="high"` and inject a
  // <link rel="preload">, competing with the actual page's own priority/LCP image for early
  // bandwidth on every route. `loading="eager"` alone still starts the fetch immediately, just at
  // normal priority — background-warming the cache without contending with the current page's
  // real content.
  //
  // The lookup itself is a tolerant best-effort: Footer renders on every page via the root
  // layout, so a failed/slow lookup here must never break page rendering for what is purely a
  // preload optimization.
  //
  // Known tradeoff, accepted deliberately: `getImageByFilename` is wrapped in React's `cache()`,
  // which only dedupes within a single request — it does NOT persist across page loads. So this
  // runs one extra lightweight `payload.find()` query (indexed lookup, limit 1) on every single
  // page view sitewide, not just on pages that link to Contact. If this ever needs to be
  // eliminated (e.g. under real load), switch to a longer-lived cache (`unstable_cache` or a
  // module-level revalidated cache) instead of `react`'s per-request `cache()`.
  const wiesbadenImageUrl = await getImageByFilename('wiesbaden.webp')
    .then((image) => getValidImageUrl(image))
    .catch(() => null)

  return (
    <footer>
      {wiesbadenImageUrl && (
        <Image
          src={wiesbadenImageUrl}
          alt=""
          aria-hidden="true"
          width={1}
          height={1}
          sizes="(max-width: 1024px) 100vw, 75vw"
          loading="eager"
          className="pointer-events-none absolute h-px w-px overflow-hidden opacity-0"
        />
      )}
      <div className="relative overflow-hidden bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <FooterNavigation locale={locale} />
        </div>
        <FooterDecorations />
      </div>
      <div className="bg-primary-platinum">
        <div className="mx-auto max-w-7xl px-4 py-8 pb-safe sm:px-6 md:pb-8 lg:px-8">
          <FooterInfo locale={locale} />
        </div>
      </div>
    </footer>
  )
}

export default Footer
export { FooterInfo as Info, FooterNavigation as Navigation }
