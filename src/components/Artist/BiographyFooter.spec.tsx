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
    expect(details).toHaveClass('font-bold', 'text-sm')
    expect(details).not.toHaveClass('!m-0', '!mt-1', '!mb-0')
    expect(consent).toHaveClass('font-bold', 'text-sm')
    expect(consent).not.toHaveClass('!m-0', '!mt-1', '!mb-0')
    expect(screen.getByText('Saison 2025/2026 • Foto: Uwe Arens • Online Merker')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Änderungen und Kürzungen bedürfen der Absprache mit der Künstlersekretariat Astrid Schoerke GmbH'
      )
    ).toBeInTheDocument()
  })

  it('renders English labels and consent', () => {
    renderFooter(<BiographyFooter season="2025/2026" image={imageWithCredit('Uwe Arens')} />, 'en')

    expect(screen.getByText('Season 2025/2026 • Photo: Uwe Arens')).toBeInTheDocument()
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

    expect(screen.getByText('Saison 2025/2026 • Foto: Uwe Arens • Online Merker')).toBeInTheDocument()
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

    expect(screen.getByText(details)).toBeInTheDocument()
    expect(screen.getByText(consent)).toBeInTheDocument()
  })
})
