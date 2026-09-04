interface Performer {
  id?: string
  name: string
  instrument: string
}

interface EnsembleGroup {
  id?: string
  groupName: string
  members: Performer[]
}

type Item = { type: 'performer'; performer: Performer } | { type: 'ensembleGroup'; group: EnsembleGroup }

interface PerformersListProps {
  title?: unknown
  items?: unknown
}

interface PerformerRowProps {
  performer: Performer
}

function trimText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function getPerformer(value: unknown): Performer | null {
  if (!value || typeof value !== 'object') return null

  const item = value as { id?: unknown; name?: unknown; instrument?: unknown }
  const name = trimText(item.name)

  if (!name) return null

  return {
    id: typeof item.id === 'string' ? item.id : undefined,
    name,
    instrument: trimText(item.instrument),
  }
}

function isPerformer(value: Performer | null): value is Performer {
  return value !== null
}

function getItem(value: unknown): Item | null {
  if (!value || typeof value !== 'object') return null

  const item = value as { id?: unknown; blockType?: unknown; groupName?: unknown; members?: unknown }

  if (item.blockType === 'performer') {
    const performer = getPerformer(value)
    return performer ? { type: 'performer', performer } : null
  }

  if (item.blockType !== 'ensembleGroup') return null

  const groupName = trimText(item.groupName)
  if (!groupName) return null

  return {
    type: 'ensembleGroup',
    group: {
      id: typeof item.id === 'string' ? item.id : undefined,
      groupName,
      members: Array.isArray(item.members) ? item.members.map(getPerformer).filter(isPerformer) : [],
    },
  }
}

function isItem(value: Item | null): value is Item {
  return value !== null
}

const PerformerRow: React.FC<PerformerRowProps> = ({ performer }) => {
  return (
    <div className="flex min-w-0 flex-wrap gap-x-2 gap-y-0">
      <span className="min-w-0 break-words [overflow-wrap:anywhere] font-semibold">{performer.name}</span>
      {performer.instrument ? (
        <>
          <span className="sr-only">, </span>
          <span className="min-w-0 break-words [overflow-wrap:anywhere] text-gray-500">{performer.instrument}</span>
        </>
      ) : null}
    </div>
  )
}

const PerformersList: React.FC<PerformersListProps> = ({ title, items }) => {
  const validItems = Array.isArray(items) ? items.map(getItem).filter(isItem) : []
  const titleText = trimText(title)

  if (validItems.length === 0) return null

  return (
    <div className="text-sm leading-snug">
      {titleText ? (
        <div className="mb-2 flex items-center gap-3">
          <span aria-hidden="true" className="bg-primary-yellow h-0.5 w-6 shrink-0" />
          <h3 className="!m-0 !text-base !font-semibold !leading-snug !text-primary-black">{titleText}</h3>
        </div>
      ) : null}
      <ul className="!m-0 flex !list-none flex-col gap-1.5 !p-0">
        {validItems.map((item, index) => {
          if (item.type === 'performer') {
            return (
              <li className="!m-0 !p-0" key={item.performer.id ?? `item-${index}`}>
                <PerformerRow performer={item.performer} />
              </li>
            )
          }

          return (
            <li className="!m-0 !p-0" key={item.group.id ?? `item-${index}`}>
              <div className="flex flex-col gap-1">
                <div className="font-semibold">{item.group.groupName}</div>
                {item.group.members.length > 0 ? (
                  <ul className="!m-0 flex !list-none flex-col gap-1 !pl-4 !p-0">
                    {item.group.members.map((member, memberIndex) => (
                      <li className="!m-0 !p-0" key={member.id ?? `member-${memberIndex}`}>
                        <PerformerRow performer={member} />
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default PerformersList
