// @vitest-environment happy-dom
import type { Artist } from '@/payload-types'
import de from '@/i18n/de'
import en from '@/i18n/en'
import { NextIntlTestProvider } from '@/tests/utils/NextIntlProvider'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import BiographyFooter from './BiographyFooter'

const messages = { de, en }

function renderFooter(ui: React.ReactElement, locale: 'de' | 'en' = 'de') {
  return render(
    <NextIntlTestProvider locale={locale} messages={messages[locale]}>
      {ui}
    </NextIntlTestProvider>
  )
}

function imageWithCredit(credit: string): Artist['image'] {
  return { id: 1, url: '/artist.jpg', credit } as Artist['image']
}

describe('BiographyFooter', () => {
  it('renders German season, photo, source, and consent', () => {
    const { container } = renderFooter(
      <BiographyFooter season="2025/2026" image={imageWithCredit('Uwe Arens')} quoteSource="Online Merker" />
    )

    const footer = container.querySelector('footer.biography-footer')
    const [details, consent] = container.querySelectorAll('footer > p')

    expect(footer).toBeInTheDocument()
    expect(details).toHaveClass('font-normal', 'text-sm')
    expect(details).not.toHaveClass('!m-0', '!mt-1', '!mb-0')
    expect(consent).toHaveClass('font-normal', 'text-sm')
    expect(consent).not.toHaveClass('!m-0', '!mt-1', '!mb-0')
    expect(screen.getByTestId('biography-footer-details')).toHaveTextContent(
      'Saison 2025/2026 • Foto: Uwe Arens • Zitat: Online Merker'
    )
    expect(
      screen.getByText(
        'Änderungen und Kürzungen bedürfen der Absprache mit der Künstlersekretariat Astrid Schoerke GmbH'
      )
    ).toBeInTheDocument()
  })

  it('renders English labels and consent', () => {
    renderFooter(<BiographyFooter season="2025/2026" image={imageWithCredit('Uwe Arens')} />, 'en')

    expect(screen.getByTestId('biography-footer-details')).toHaveTextContent('Season 2025/2026 • Photo: Uwe Arens')
    expect(
      screen.getByText('Amendments or edits need the consent of Künstlersekretariat Astrid Schoerke GmbH')
    ).toBeInTheDocument()
  })

  it('renders season alone without a separator', () => {
    renderFooter(<BiographyFooter season="2025/2026" />)

    expect(screen.getByText('Saison 2025/2026')).toBeInTheDocument()
    expect(screen.getByText('Saison 2025/2026')).not.toHaveTextContent('•')
  })

  it('trims photo credit and quote source', () => {
    renderFooter(
      <BiographyFooter season="2025/2026" image={imageWithCredit(' Uwe Arens ')} quoteSource=" Online Merker " />
    )

    expect(screen.getByTestId('biography-footer-details')).toHaveTextContent(
      'Saison 2025/2026 • Foto: Uwe Arens • Zitat: Online Merker'
    )
  })

  it.each([
    ['an unpopulated ID', 1],
    ['null', null],
    ['undefined', undefined],
    ['a blank credit', imageWithCredit('   ')],
  ])('omits photo for %s', (_shape, image) => {
    renderFooter(<BiographyFooter season="2025/2026" image={image} />)

    expect(screen.getByText('Saison 2025/2026')).toBeInTheDocument()
    expect(screen.queryByText(/^Foto:/)).not.toBeInTheDocument()
  })

  it('omits a blank quote source', () => {
    renderFooter(<BiographyFooter season="2025/2026" quoteSource="  " />)

    expect(screen.getByText('Saison 2025/2026')).toBeInTheDocument()
    expect(screen.getByText('Saison 2025/2026')).not.toHaveTextContent('•')
  })

  it('renders a responsive divider and regular-weight text', () => {
    const { container } = renderFooter(<BiographyFooter season="2025/2026" />)

    expect(container.querySelector('hr')).toHaveClass('w-full', 'md:w-3/4')
    expect(screen.getByTestId('biography-footer-details')).toHaveClass('font-normal')
  })

  it('stacks metadata on mobile and joins it inline from sm', () => {
    const { container } = renderFooter(
      <BiographyFooter season="2025/2026" image={imageWithCredit('Uwe Arens')} quoteSource="Online Merker" />
    )

    expect(screen.getByText('Saison 2025/2026')).toHaveClass('block', 'sm:inline')
    expect(screen.getByText('Foto: Uwe Arens')).toHaveClass('block', 'sm:inline')
    expect(screen.getByText('Zitat: Online Merker')).toHaveClass('block', 'sm:inline')
    expect(container.querySelectorAll('span.hidden.sm\\:inline')).toHaveLength(2)
  })

  it.each([
    [
      'de',
      'Saison 2025/2026 • Foto: Uwe Arens',
      'Änderungen und Kürzungen bedürfen der Absprache mit der Künstlersekretariat Astrid Schoerke GmbH',
    ],
    [
      'en',
      'Season 2025/2026 • Photo: Uwe Arens',
      'Amendments or edits need the consent of Künstlersekretariat Astrid Schoerke GmbH',
    ],
  ] as const)('resolves biographyFooter catalog messages for %s', (locale, details, consent) => {
    renderFooter(<BiographyFooter season="2025/2026" image={imageWithCredit('Uwe Arens')} />, locale)

    expect(screen.getByTestId('biography-footer-details')).toHaveTextContent(details)
    expect(screen.getByText(consent)).toBeInTheDocument()
  })
})
