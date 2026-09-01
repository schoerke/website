import { Fragment, ReactNode } from 'react'

/**
 * TEMPORARY prototyping page — not part of the WorksList feature.
 * Hardcoded example data, no Payload dependency. Used to riff on the visual
 * design (two-column grid, composer groups, pause divider, hideComposerName)
 * before porting the final markup into the real component + spec.
 *
 * Models `items` the same shape as the real spec: a flat list of either a
 * composer group (composer + works[]) or a pause marker — not a flattened
 * list of individual rows. This lets us apply different spacing between
 * groups vs. within a group's own works.
 *
 * Delete this whole directory once the design is agreed on.
 */

interface Composer {
  lastName: string
  fullName: string
  birthYear?: number
  deathYear?: number
}

interface ComposerGroupItem {
  type: 'group'
  composer: Composer
  hideComposerName?: boolean
  // ReactNode, not string: the real richText work field mixes italic (title)
  // and plain (description) runs in one field — e.g. "*Legende* for trumpet
  // and piano" — so this can't be blanket-italicized as a whole string.
  // A work can also be a WorkWithMovements (see below) when it has movements.
  works: Work[]
}

// Most works are just a plain ReactNode title (matches every existing
// scenario). A work only becomes this richer shape when it has movements —
// keeps all existing scenario data untouched.
interface WorkWithMovements {
  __workWithMovements: true
  title: ReactNode
  movements: string[]
}

type Work = ReactNode | WorkWithMovements

function workWithMovements(title: ReactNode, movements: string[]): WorkWithMovements {
  return { __workWithMovements: true, title, movements }
}

function isWorkWithMovements(work: Work): work is WorkWithMovements {
  return typeof work === 'object' && work !== null && '__workWithMovements' in work
}

interface PauseItem {
  type: 'pause'
}

type ProgramItem = ComposerGroupItem | PauseItem

function formatYears(composer: Composer): string {
  const { birthYear, deathYear } = composer
  if (birthYear && deathYear) return `(${birthYear}\u2013${deathYear})`
  if (birthYear) return `(b. ${birthYear})`
  if (deathYear) return `(d. ${deathYear})`
  return ''
}

const beethoven: Composer = { lastName: 'Beethoven', fullName: 'Ludwig van Beethoven' }
const schumann: Composer = { lastName: 'Schumann', fullName: 'Robert Schumann' }
const livingComposer: Composer = { lastName: 'Adès', fullName: 'Thomas Adès' }
const enescu: Composer = { lastName: 'Enescu', fullName: 'George Enescu' }
const beethovenWithYears: Composer = { ...beethoven, birthYear: 1770, deathYear: 1827 }
const livingComposerWithYear: Composer = { ...livingComposer, birthYear: 1971 }
const longNameComposer: Composer = {
  lastName: 'Wolfgang-Amadeus-Theophilus',
  fullName: 'Johann Chrysostom Wolfgang Theophilus Mozart-Sonnenfeld',
}
const brahms: Composer = { lastName: 'Brahms', fullName: 'Johannes Brahms' }
const ravel: Composer = { lastName: 'Ravel', fullName: 'Maurice Ravel' }

// Scenario A: mixed program — multiple composers, one with 2 works, a pause, a living composer
const scenarioA: ProgramItem[] = [
  { type: 'group', composer: beethoven, works: [<em key="1">Sonata No. 14 &ldquo;Moonlight&rdquo;, Op. 27 No. 2</em>] },
  {
    type: 'group',
    composer: schumann,
    works: [<em key="1">Kinderszenen, Op. 15</em>, <em key="2">Kreisleriana, Op. 16</em>],
  },
  { type: 'group', composer: livingComposer, works: [<em key="1">In Seven Days</em>] },
  {
    type: 'group',
    composer: enescu,
    works: [
      <Fragment key="1">
        <em>Légende</em>, for trumpet and piano
      </Fragment>,
    ],
  },
]

// Scenario B: single-composer program, 3 works, composer shown once
const scenarioB: ProgramItem[] = [
  {
    type: 'group',
    composer: beethoven,
    works: [
      <em key="1">Piano Sonata No. 8 &ldquo;Pathétique&rdquo;, Op. 13</em>,
      <em key="2">Piano Sonata No. 14 &ldquo;Moonlight&rdquo;, Op. 27 No. 2</em>,
      <em key="3">Piano Sonata No. 23 &ldquo;Appassionata&rdquo;, Op. 57</em>,
    ],
  },
]

// Scenario C: one-off example with composer birth/death years shown (rare case),
// including a living composer (birth year only, no death year)
const scenarioC: ProgramItem[] = [
  { type: 'group', composer: beethovenWithYears, works: [<em key="1">Symphony No. 5, Op. 67</em>] },
  { type: 'group', composer: livingComposerWithYear, works: [<em key="1">In Seven Days</em>] },
]

// Scenario D: composer name too long for the fixed-width column — should wrap, not overflow
const scenarioD: ProgramItem[] = [
  {
    type: 'group',
    composer: longNameComposer,
    works: [<em key="1">Overture in D minor</em>, <em key="2">Serenade No. 3 in E-flat major</em>],
  },
]

// Scenario E: hideComposerName, used correctly — program title already names the
// composer ("An Evening of Brahms"), so repeating the name in the grid would be
// redundant. One group with hideComposerName; works render full-width.
const scenarioE: ProgramItem[] = [
  {
    type: 'group',
    composer: brahms,
    hideComposerName: true,
    works: [
      <em key="1">Intermezzo, Op. 118 No. 2</em>,
      <em key="2">Rhapsody, Op. 79 No. 1</em>,
      <em key="3">Ballade, Op. 10 No. 1</em>,
    ],
  },
]

// Scenario F: long work title — does it wrap sensibly in the right column?
const scenarioF: ProgramItem[] = [
  {
    type: 'group',
    composer: schumann,
    works: [
      <em key="1">
        Fantasiestücke, Op. 12, complete set of eight character pieces for solo piano — Des Abends, Aufschwung,
        Warum?, Grillen, In der Nacht, Fabel, Traumes Wirren, Ende vom Lied
      </em>,
    ],
  },
]

// Scenario G: mixed hidden/shown in one program — first half is an all-Brahms
// set with the composer name hidden (program title already names them), second
// half switches to a different, named composer.
const scenarioG: ProgramItem[] = [
  {
    type: 'group',
    composer: brahms,
    hideComposerName: true,
    works: [<em key="1">Intermezzo, Op. 118 No. 2</em>, <em key="2">Rhapsody, Op. 79 No. 1</em>],
  },
  { type: 'pause' },
  { type: 'group', composer: ravel, works: [<em key="1">Gaspard de la nuit</em>] },
]

// Scenario H: same composer in two separate, non-adjacent groups — confirms the
// name legitimately repeats rather than being merged/deduped.
const scenarioH: ProgramItem[] = [
  { type: 'group', composer: brahms, works: [<em key="1">Violin Sonata No. 1, Op. 78</em>] },
  { type: 'group', composer: schumann, works: [<em key="1">Fantasiestücke, Op. 12</em>] },
  { type: 'pause' },
  { type: 'group', composer: brahms, works: [<em key="1">Violin Sonata No. 3, Op. 108</em>] },
]

// Scenario I: same program as scenario A, with a pause reinserted between
// Schumann's group and the living-composer group. Relies on scenarioA's
// current order/length (indices 0-3) — keep in sync if scenarioA changes.
const scenarioI: ProgramItem[] = [scenarioA[0], scenarioA[1], { type: 'pause' }, scenarioA[2], scenarioA[3]]

const mendelssohn: Composer = { lastName: 'Mendelssohn', fullName: 'Felix Mendelssohn' }
const dvorak: Composer = { lastName: 'Dvořák', fullName: 'Antonín Dvořák' }

// Same-surname collision edge case: both Schumanns disambiguated in lastName
// itself (not just the internal value/slug), per the composers.ts convention
// for entries known to collide — scoped to this example only, since the
// shared `schumann` const above has no collision in the other scenarios.
const robertSchumannDisambiguated: Composer = { lastName: 'R. Schumann', fullName: 'Robert Schumann' }
const claraSchumann: Composer = { lastName: 'C. Schumann', fullName: 'Clara Schumann' }

// Bach family — same disambiguation convention, applied to the canonical
// example from the spec (slug convention: bach-js / bach-cpe).
const jsBach: Composer = { lastName: 'J.S. Bach', fullName: 'Johann Sebastian Bach' }
const cpeBach: Composer = { lastName: 'C.P.E. Bach', fullName: 'Carl Philipp Emanuel Bach' }

// The spec's 'no-composer' sentinel entry (see composers.ts design): empty
// lastName so the default rendering is blank, fullName for the admin
// dropdown / showFullNames mode.
const noComposer: Composer = { lastName: '', fullName: 'No composer' }

// Scenario K: a work with movements, and a no-composer group (e.g. an
// improvisation) — both new spec additions.
const scenarioK: ProgramItem[] = [
  {
    type: 'group',
    composer: beethoven,
    works: [
      workWithMovements(<em>Symphony No. 9 in D minor, Op. 125 &ldquo;Choral&rdquo;</em>, [
        'I. Allegro ma non troppo, un poco maestoso',
        'II. Molto vivace',
        'III. Adagio molto e cantabile',
        'IV. Presto \u2014 \u201cOde to Joy\u201d',
      ]),
      // Movements don't have to be one-per-line — `movement` is plain text,
      // so an editor can just type a condensed single line combining several
      // movements when that reads better (no separate feature needed).
      workWithMovements(<em>Piano Sonata No. 8 &ldquo;Pathétique&rdquo;, Op. 13</em>, [
        'I. Grave \u2014 Allegro di molto e con brio \u2014 II. Adagio cantabile \u2014 III. Rondo: Allegro molto e con brio, in F minor, a very long movement listing intended to test wrap behavior for a single condensed movements line',
      ]),
    ],
  },
  { type: 'pause' },
  { type: 'group', composer: noComposer, works: [<em key="1">Improvisation on themes from the first half</em>] },
]

// Repertoire example: a realistic Repertoire collection entry (e.g. an
// artist's standard concerto/chamber repertoire) — no pauses (that's a
// concert-program concept, not a repertoire list), just composers with
// however many works each. Ordered alphabetically by surname (ties broken
// by given name, e.g. C.P.E. before J.S. Bach, Clara before Robert Schumann).
const repertoireExample: ProgramItem[] = [
  { type: 'group', composer: cpeBach, works: [<em key="1">Concerto in D minor, Wq 22</em>] },
  { type: 'group', composer: jsBach, works: [<em key="1">Italian Concerto in F major, BWV 971</em>] },
  {
    type: 'group',
    composer: beethoven,
    works: [
      <em key="1">Piano Concerto No. 3 in C minor, Op. 37</em>,
      <em key="2">Piano Concerto No. 4 in G major, Op. 58</em>,
      <em key="3">Piano Concerto No. 5 &ldquo;Emperor&rdquo;, Op. 73</em>,
    ],
  },
  {
    type: 'group',
    composer: brahms,
    works: [<em key="1">Piano Concerto No. 1 in D minor, Op. 15</em>, <em key="2">Piano Concerto No. 2 in B-flat major, Op. 83</em>],
  },
  { type: 'group', composer: dvorak, works: [<em key="1">Piano Concerto in G minor, Op. 33</em>] },
  {
    type: 'group',
    composer: mendelssohn,
    works: [
      <em key="1">Piano Concerto No. 1 in G minor, Op. 25</em>,
      <em key="2">Piano Concerto No. 2 in D minor, Op. 40</em>,
    ],
  },
  {
    type: 'group',
    composer: ravel,
    works: [
      <em key="1">Piano Concerto in G major</em>,
      <Fragment key="2">
        <em>Piano Concerto for the Left Hand</em>, in D major
      </Fragment>,
    ],
  },
  { type: 'group', composer: claraSchumann, works: [<em key="1">Piano Concerto in A minor, Op. 7</em>] },
  { type: 'group', composer: robertSchumannDisambiguated, works: [<em key="1">Piano Concerto in A minor, Op. 54</em>] },
]

function WorkLine({ work }: { work: Work }) {
  const title = isWorkWithMovements(work) ? work.title : work
  const movements = isWorkWithMovements(work) ? work.movements : []
  return (
    <div className="pl-4 -indent-4">
      {title}
      {movements.map((movement, i) => (
        <div key={i} className="pl-8 -indent-4 text-xs italic">
          {movement}
        </div>
      ))}
    </div>
  )
}

function ProgramGrid({ items, showFullNames }: { items: ProgramItem[]; showFullNames?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5 text-sm leading-snug">
      {items.map((item, itemIndex) => {
        if (item.type === 'pause') {
          return (
            <div key={itemIndex} className="flex items-center gap-4 py-1 italic text-gray-500">
              <span className="h-px w-8 bg-gray-300" aria-hidden="true" />
              <span>Pause</span>
              <span className="h-px w-8 bg-gray-300" aria-hidden="true" />
            </div>
          )
        }

        if (item.hideComposerName) {
          return (
            <div key={itemIndex} className="flex flex-col gap-1">
              {item.works.map((work, workIndex) => (
                <WorkLine key={workIndex} work={work} />
              ))}
            </div>
          )
        }

        const name = showFullNames ? item.composer.fullName : item.composer.lastName
        const years = formatYears(item.composer)

        // Each group is its own flex row: name column + an independent works
        // stack. The works stack's height is purely its own content — if the
        // name wraps taller than the works combined (e.g. a very long name
        // with few short works), it doesn't force the works column to
        // stretch or leave artificial blank space beneath them.
        return (
          <div key={itemIndex} className="flex flex-col items-start gap-1 md:flex-row md:gap-6">
            <div className="font-semibold md:w-48 md:shrink-0">
              {name} {years && <span className="font-normal text-xs text-gray-500">{years}</span>}
            </div>
            <div className="flex flex-col gap-1">
              {item.works.map((work, workIndex) => (
                <WorkLine key={workIndex} work={work} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

const WorksListPrototypePage: React.FC = () => {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-16 px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <h1 className="text-3xl font-bold">Programs</h1>

      <section>
        <h2 className="mb-6 text-base font-semibold">1. Mixed program (last names, default)</h2>
        <ProgramGrid items={scenarioA} />
      </section>

      <section>
        <h2 className="mb-6 text-base font-semibold">2. Same, with showFullNames on</h2>
        <ProgramGrid items={scenarioA} showFullNames />
      </section>

      <section>
        <h2 className="mb-6 text-base font-semibold">3. Pause divider between two composer groups</h2>
        <ProgramGrid items={scenarioI} />
      </section>

      <section>
        <h2 className="mb-6 text-base font-semibold">4. Block&rsquo;s optional title field</h2>
        <p className="mb-2 text-lg font-bold">Season Opening Gala</p>
        <ProgramGrid items={scenarioA} />
      </section>

      <section>
        <h2 className="mb-6 text-base font-semibold">5. Single-composer program</h2>
        <ProgramGrid items={scenarioB} />
      </section>

      <section>
        <h2 className="mb-6 text-base font-semibold">
          6. hideComposerName (builds on #4 + #5 — title already names the composer)
        </h2>
        <p className="mb-2 text-lg font-bold">An Evening of Brahms</p>
        <ProgramGrid items={scenarioE} />
      </section>

      <section>
        <h2 className="mb-6 text-base font-semibold">7. Birth/death years shown (rare case)</h2>
        <ProgramGrid items={scenarioC} />
      </section>

      <section>
        <h2 className="mb-6 text-base font-semibold">8. Composer name longer than the column (edge case)</h2>
        <ProgramGrid items={scenarioD} />
        {/* mt-1.5 matches ProgramGrid's own inter-group gap-1.5, so these two
            demo instances read with the same rhythm as groups within one grid */}
        <div className="mt-1.5">
          <ProgramGrid items={scenarioD} showFullNames />
        </div>
      </section>

      <section>
        <h2 className="mb-6 text-base font-semibold">9. Long work title wrapping in the right column (edge case)</h2>
        <ProgramGrid items={scenarioF} />
      </section>

      <section>
        <h2 className="mb-6 text-base font-semibold">10. Mixed hidden/shown composers in one program (edge case)</h2>
        <p className="mb-2 text-lg font-bold">An Evening of Brahms — with a Guest Encore</p>
        <ProgramGrid items={scenarioG} />
      </section>

      <section>
        <h2 className="mb-6 text-base font-semibold">11. Same composer in two non-adjacent groups (edge case)</h2>
        <ProgramGrid items={scenarioH} />
      </section>

      <section>
        <h2 className="mb-6 text-base font-semibold">
          12. Work movements, and a no-composer group (edge case)
        </h2>
        <ProgramGrid items={scenarioK} />
      </section>

      <section>
        <h1 className="mb-6 text-3xl font-bold">Repertoire</h1>
        <ProgramGrid items={repertoireExample} />
      </section>
    </div>
  )
}

export default WorksListPrototypePage
