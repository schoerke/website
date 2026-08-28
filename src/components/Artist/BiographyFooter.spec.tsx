// @vitest-environment happy-dom
import type { Artist } from '@/payload-types'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import BiographyFooter from './BiographyFooter'

const state = vi.hoisted(() => ({ locale: 'de' as 'de' | 'en' }))

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: { season?: string; credit?: string }) => {
    const translations = {
      de: {
        season: `Saison ${values?.season}`,
        photo: `Foto: ${values?.credit}`,
        consent: 'Änderungen und Kürzungen bedürfen der Absprache mit der Künstlersekretariat Astrid Schoerke GmbH',
      },
      en: {
        season: `Season ${values?.season}`,
        photo: `Photo: ${values?.credit}`,
        consent: 'Amendments or edits need the consent of Künstlersekretariat Astrid Schoerke GmbH',
      },
    }

    return translations[state.locale][key as keyof (typeof translations)['de']]
  },
}))

function imageWithCredit(credit: string): Artist['image'] {
  return { id: 1, url: '/artist.jpg', credit } as Artist['image']
}

describe('BiographyFooter', () => {
  it('renders German season, photo, source, and consent', () => {
    state.locale = 'de'
    const { container } = render(
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
    state.locale = 'en'
    render(<BiographyFooter season="2025/2026" image={imageWithCredit('Uwe Arens')} />)

    expect(screen.getByText('Season 2025/2026 • Photo: Uwe Arens')).toBeInTheDocument()
    expect(
      screen.getByText('Amendments or edits need the consent of Künstlersekretariat Astrid Schoerke GmbH')
    ).toBeInTheDocument()
  })

  it('renders season alone without a separator', () => {
    state.locale = 'de'
    render(<BiographyFooter season="2025/2026" />)

    expect(screen.getByText('Saison 2025/2026')).toBeInTheDocument()
    expect(screen.getByText('Saison 2025/2026')).not.toHaveTextContent('•')
  })

  it('trims photo credit and quote source', () => {
    state.locale = 'de'
    render(<BiographyFooter season="2025/2026" image={imageWithCredit(' Uwe Arens ')} quoteSource=" Online Merker " />)

    expect(screen.getByText('Saison 2025/2026 • Foto: Uwe Arens • Online Merker')).toBeInTheDocument()
  })

  it.each([
    ['an unpopulated ID', 1],
    ['null', null],
    ['undefined', undefined],
    ['a blank credit', imageWithCredit('   ')],
  ])('omits photo for %s', (_shape, image) => {
    state.locale = 'de'
    render(<BiographyFooter season="2025/2026" image={image} />)

    expect(screen.getByText('Saison 2025/2026')).toBeInTheDocument()
    expect(screen.queryByText(/^Foto:/)).not.toBeInTheDocument()
  })

  it('omits a blank quote source', () => {
    state.locale = 'de'
    render(<BiographyFooter season="2025/2026" quoteSource="  " />)

    expect(screen.getByText('Saison 2025/2026')).toBeInTheDocument()
    expect(screen.getByText('Saison 2025/2026')).not.toHaveTextContent('•')
  })
})
