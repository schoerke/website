import { kebabCase } from 'lodash'

const artists = [
  'Tzimon Barto',
  'Marc Gruber',
  'Claire Huangci',
  'Ruth Killius',
  'Christian Poltéra',
  'Martin Stadtfeld',
  'Maurice Steger',
  'Mario Venzago',
  'Christian Zacharias',
  'Thomas Zehetmair',
]

export const mapArtistOptions = () => {
  let options: { label: string; value: string }[] = []

  artists.map((artist) => {
    const option = {
      label: `Artist - ${artist}`,
      value: kebabCase(artist),
    }

    options.push(option)
  })

  return options
}

const artistOptions = mapArtistOptions()

export const categoryOptions = [
  {
    label: 'News',
    value: 'news',
  },
  {
    label: 'Projects',
    value: 'projects',
  },
  {
    label: 'Home',
    value: 'home',
  },
  ...artistOptions,
]

export const instrumentOptions = [
  {
    value: 'piano',
    label: 'Piano',
  },
]
