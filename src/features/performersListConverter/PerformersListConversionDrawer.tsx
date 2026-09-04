'use client'

import { Button, Drawer, MoreIcon, Popup, PopupList, TextInput, useModal } from '@payloadcms/ui'
import { ArrowDown, ArrowUp } from 'lucide-react'
import React from 'react'

import {
  autoNestPerformers,
  deleteDraftItem,
  moveDraftItemDown,
  moveDraftItemUp,
  nestInPreviousGroup,
  toConvertedItems,
  unnestMember,
  type DraftItem,
  type DraftPerformer,
  type ConvertedItem,
} from './draft'
import { normalizeDisplayText, parsePerformersListLine } from './parser'
import type { PerformersListSource } from './selection'

import './PerformersListConversionDrawer.scss'

interface PerformersListConversionDrawerProps {
  locale?: string
  onCancel: () => void
  onConfirm: (items: ConvertedItem[]) => void
  slug: string
  sources: PerformersListSource[]
}

type FocusTarget = { kind: 'heading' } | { kind: 'name'; sourceId: string }

function createDraft(sources: PerformersListSource[]): DraftItem[] {
  const rows = sources.map((source): DraftItem => {
    const parsed = parsePerformersListLine(source.text)
    const base = {
      sourceId: source.sourceId,
      originalText: source.text,
      ...(source.url ? { discardedLinkUrl: source.url } : {}),
      ...(parsed.type === 'invalid' ? { parseError: parsed.reason } : {}),
    }
    if (parsed.type === 'ensembleGroup')
      return { ...base, type: 'ensembleGroup', groupName: parsed.groupName, members: [] }
    return {
      ...base,
      type: 'performer',
      name: parsed.type === 'performer' ? parsed.name : '',
      ...(parsed.type === 'performer' && parsed.instrument ? { instrument: parsed.instrument } : {}),
    }
  })
  return autoNestPerformers(rows)
}

function flatRows(draft: DraftItem[]): DraftItem[] {
  return draft.flatMap((item) => (item.type === 'ensembleGroup' ? [item, ...item.members] : [item]))
}

function updateDraftText(
  draft: DraftItem[],
  sourceId: string,
  field: 'name' | 'groupName' | 'instrument',
  value: string
): DraftItem[] {
  return draft.map((item) => {
    if (item.sourceId === sourceId) return { ...item, [field]: value } as DraftItem
    if (item.type !== 'ensembleGroup') return item
    return {
      ...item,
      members: item.members.map((member) => (member.sourceId === sourceId ? { ...member, [field]: value } : member)),
    }
  })
}

function getValidationErrors(draft: DraftItem[]): Map<string, string> {
  const errors = new Map<string, string>()
  for (const item of draft) {
    if (item.type === 'performer') {
      if (!normalizeDisplayText(item.name)) errors.set(item.sourceId, `Performer "${item.sourceId}" needs a name`)
      continue
    }
    const groupName = normalizeDisplayText(item.groupName)
    if (!groupName) errors.set(item.sourceId, `Group "${item.sourceId}" needs a name`)
    else if (item.members.length === 0) errors.set(item.sourceId, `Group "${groupName}" needs at least one member`)
    for (const member of item.members) {
      if (!normalizeDisplayText(member.name)) errors.set(member.sourceId, `Member "${member.sourceId}" needs a name`)
    }
  }
  return errors
}

interface DrawerFormProps extends Omit<PerformersListConversionDrawerProps, 'slug'> {
  close: () => void
}

const DrawerForm: React.FC<DrawerFormProps> = ({ close, onCancel, onConfirm, sources }) => {
  const [draft, setDraft] = React.useState<DraftItem[]>(() => createDraft(sources))
  const [linkAcknowledged, setLinkAcknowledged] = React.useState(false)
  const [deletionAcknowledged, setDeletionAcknowledged] = React.useState(false)
  const focusTargetRef = React.useRef<FocusTarget | undefined>(undefined)
  const fallbackFocusRef = React.useRef<HTMLDivElement>(null)
  const result = toConvertedItems(draft)
  const validationErrors = getValidationErrors(draft)
  const sourceIds = new Set(flatRows(draft).map((item) => item.sourceId))
  const deletedCount = sources.filter((source) => !sourceIds.has(source.sourceId)).length
  const linkedCount = sources.filter((source) => normalizeDisplayText(source.url ?? '')).length
  const canConfirm =
    result.ok &&
    result.items.length > 0 &&
    (!linkedCount || linkAcknowledged) &&
    (!deletedCount || deletionAcknowledged)

  React.useEffect(() => {
    const focusTarget = focusTargetRef.current
    if (!focusTarget) return
    if (focusTarget.kind === 'heading') fallbackFocusRef.current?.focus()
    if (focusTarget.kind === 'name') {
      const groupName = document.getElementById(`field-performers-${focusTarget.sourceId}-group-name`)
      const performerName = document.getElementById(`field-performers-${focusTarget.sourceId}-name`)
      ;(groupName ?? performerName)?.focus()
    }
    focusTargetRef.current = undefined
  }, [draft])

  const mutate = (mutation: (current: DraftItem[]) => DraftItem[]): void => setDraft(mutation)

  const deleteRow = (sourceId: string): void => {
    const memberGroup = draft.find(
      (item): item is Extract<DraftItem, { type: 'ensembleGroup' }> =>
        item.type === 'ensembleGroup' && item.members.some((member) => member.sourceId === sourceId)
    )
    if (memberGroup) {
      const memberIndex = memberGroup.members.findIndex((member) => member.sourceId === sourceId)
      const focusMember = memberGroup.members[memberIndex + 1] ?? memberGroup.members[memberIndex - 1]
      focusTargetRef.current = focusMember
        ? { kind: 'name', sourceId: focusMember.sourceId }
        : { kind: 'name', sourceId: memberGroup.sourceId }
      setDraft(deleteDraftItem(draft, sourceId))
      return
    }

    const next = deleteDraftItem(draft, sourceId)
    const oldIndex = draft.findIndex((item) => item.sourceId === sourceId)
    const deleted = draft[oldIndex]
    const target =
      deleted?.type === 'ensembleGroup'
        ? (draft[oldIndex + 1] ?? draft[oldIndex - 1] ?? deleted.members[0])
        : (next[oldIndex] ?? next[oldIndex - 1])
    focusTargetRef.current = target ? { kind: 'name', sourceId: target.sourceId } : { kind: 'heading' }
    setDraft(next)
  }

  const confirm = (): void => {
    if (!canConfirm || !result.ok) return
    close()
    onConfirm(result.items)
  }

  const renderPerformer = (
    item: DraftPerformer,
    member: boolean,
    index: number,
    length: number,
    parentIndex?: number
  ): React.ReactNode => {
    const context = normalizeDisplayText(item.originalText) || item.sourceId
    const ordinal = member ? `member ${index + 1} in row ${parentIndex! + 1}` : `row ${index + 1}`
    const nameLabel = `Name: ${context}, ${ordinal}`
    const nameError = validationErrors.get(item.sourceId)
    const errorId = `performers-${member ? 'member' : 'performer'}-${item.sourceId}-error`
    return (
      <section
        className={member ? 'performers-list-conversion-drawer__member' : 'performers-list-conversion-drawer__row'}
        key={item.sourceId}
      >
        {item.parseError && (
          <p className="performers-list-conversion-drawer__error" role="alert">
            {item.parseError}
          </p>
        )}
        {item.discardedLinkUrl && (
          <p className="performers-list-conversion-drawer__url">{normalizeDisplayText(item.discardedLinkUrl)}</p>
        )}
        <div className="performers-list-conversion-drawer__row-layout">
          <div className="performers-list-conversion-drawer__fields">
            <div className="performers-list-conversion-drawer__grid">
              <TextInput
                Error={
                  nameError ? (
                    <p id={errorId} role="alert">
                      {nameError}
                    </p>
                  ) : undefined
                }
                aria-describedby={nameError ? errorId : undefined}
                aria-label={nameLabel}
                label="Name"
                onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                  mutate((current) => updateDraftText(current, item.sourceId, 'name', event.target.value))
                }
                path={`performers-${item.sourceId}-name`}
                showError={Boolean(nameError)}
                value={item.name}
              />
              <TextInput
                aria-label={`Instrument: ${context}, ${ordinal}`}
                label="Instrument"
                onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                  mutate((current) => updateDraftText(current, item.sourceId, 'instrument', event.target.value))
                }
                path={`performers-${item.sourceId}-instrument`}
                value={item.instrument ?? ''}
              />
            </div>
          </div>
          <div className="performers-list-conversion-drawer__controls">
            <Button
              aria-label={`Move ${context} up, ${ordinal}`}
              disabled={index === 0}
              icon={<ArrowUp aria-hidden={true} size={16} />}
              onClick={() => mutate((current) => moveDraftItemUp(current, item.sourceId))}
              round
              size="small"
              tooltip="Move up"
              type="button"
            />
            <Button
              aria-label={`Move ${context} down, ${ordinal}`}
              disabled={index === length - 1}
              icon={<ArrowDown aria-hidden={true} size={16} />}
              onClick={() => mutate((current) => moveDraftItemDown(current, item.sourceId))}
              round
              size="small"
              tooltip="Move down"
              type="button"
            />
            <Popup
              button={
                <>
                  <MoreIcon />
                  <span className="sr-only">
                    Actions for {context}, {ordinal}
                  </span>
                </>
              }
              buttonClassName="performers-list-conversion-drawer__actions-button"
              caret={false}
              horizontalAlign="right"
              render={({ close: closePopup }) => (
                <PopupList.ButtonGroup buttonSize="small">
                  <PopupList.Button
                    aria-label={
                      member
                        ? `Remove ${context} from group, ${ordinal}`
                        : `Add ${context} to previous group, ${ordinal}`
                    }
                    disabled={!member && (index === 0 || draft[index - 1]?.type !== 'ensembleGroup')}
                    onClick={() => {
                      mutate((current) =>
                        member ? unnestMember(current, item.sourceId) : nestInPreviousGroup(current, item.sourceId)
                      )
                      closePopup()
                    }}
                  >
                    {member ? 'Remove from group' : 'Add to group'}
                  </PopupList.Button>
                  <PopupList.Button
                    aria-label={`Delete ${context}, ${ordinal}`}
                    onClick={() => {
                      deleteRow(item.sourceId)
                      closePopup()
                    }}
                  >
                    Delete
                  </PopupList.Button>
                </PopupList.ButtonGroup>
              )}
              size="large"
            />
          </div>
        </div>
      </section>
    )
  }

  return (
    <div className="performers-list-conversion-drawer">
      <div aria-label="Performers list conversion controls" ref={fallbackFocusRef} tabIndex={-1} />
      {draft.map((item, index) =>
        item.type === 'performer' ? (
          renderPerformer(item, false, index, draft.length)
        ) : (
          <section className="performers-list-conversion-drawer__row" key={item.sourceId}>
            {item.parseError && (
              <p className="performers-list-conversion-drawer__error" role="alert">
                {item.parseError}
              </p>
            )}
            {item.discardedLinkUrl && (
              <p className="performers-list-conversion-drawer__url">{normalizeDisplayText(item.discardedLinkUrl)}</p>
            )}
            <div className="performers-list-conversion-drawer__row-layout">
              <div className="performers-list-conversion-drawer__fields">
                <TextInput
                  Error={
                    validationErrors.get(item.sourceId) ? (
                      <p id={`performers-group-${item.sourceId}-error`} role="alert">
                        {validationErrors.get(item.sourceId)}
                      </p>
                    ) : undefined
                  }
                  aria-describedby={
                    validationErrors.get(item.sourceId) ? `performers-group-${item.sourceId}-error` : undefined
                  }
                  aria-label={`Group name: ${normalizeDisplayText(item.originalText) || item.sourceId}, row ${index + 1}`}
                  label="Group name"
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    mutate((current) => updateDraftText(current, item.sourceId, 'groupName', event.target.value))
                  }
                  path={`performers-${item.sourceId}-group-name`}
                  showError={Boolean(validationErrors.get(item.sourceId))}
                  value={item.groupName}
                />
              </div>
              <div className="performers-list-conversion-drawer__controls">
                <Button
                  aria-label={`Move ${normalizeDisplayText(item.originalText) || item.sourceId} up, row ${index + 1}`}
                  disabled={index === 0}
                  icon={<ArrowUp aria-hidden={true} size={16} />}
                  onClick={() => mutate((current) => moveDraftItemUp(current, item.sourceId))}
                  round
                  size="small"
                  tooltip="Move up"
                  type="button"
                />
                <Button
                  aria-label={`Move ${normalizeDisplayText(item.originalText) || item.sourceId} down, row ${index + 1}`}
                  disabled={index === draft.length - 1}
                  icon={<ArrowDown aria-hidden={true} size={16} />}
                  onClick={() => mutate((current) => moveDraftItemDown(current, item.sourceId))}
                  round
                  size="small"
                  tooltip="Move down"
                  type="button"
                />
                <Popup
                  button={
                    <>
                      <MoreIcon />
                      <span className="sr-only">
                        Actions for {normalizeDisplayText(item.originalText) || item.sourceId}, row {index + 1}
                      </span>
                    </>
                  }
                  buttonClassName="performers-list-conversion-drawer__actions-button"
                  caret={false}
                  horizontalAlign="right"
                  render={({ close: closePopup }) => (
                    <PopupList.ButtonGroup buttonSize="small">
                      <PopupList.Button
                        aria-label={`Delete ${normalizeDisplayText(item.originalText) || item.sourceId}, row ${index + 1}`}
                        onClick={() => {
                          deleteRow(item.sourceId)
                          closePopup()
                        }}
                      >
                        Delete
                      </PopupList.Button>
                    </PopupList.ButtonGroup>
                  )}
                  size="large"
                />
              </div>
            </div>
            <div className="performers-list-conversion-drawer__members">
              {item.members.map((member, memberIndex) =>
                renderPerformer(member, true, memberIndex, item.members.length, index)
              )}
            </div>
          </section>
        )
      )}
      {linkedCount > 0 && (
        <label>
          <input
            checked={linkAcknowledged}
            onChange={(event) => setLinkAcknowledged(event.target.checked)}
            type="checkbox"
          />
          Acknowledge loss of {linkedCount} discarded link{linkedCount === 1 ? '' : 's'}
        </label>
      )}
      {deletedCount > 0 && (
        <>
          <p>
            {deletedCount} source row{deletedCount === 1 ? ' will' : 's will'} be deleted.
          </p>
          <label>
            <input
              checked={deletionAcknowledged}
              onChange={(event) => setDeletionAcknowledged(event.target.checked)}
              type="checkbox"
            />
            Acknowledge deletion of {deletedCount} source row{deletedCount === 1 ? '' : 's'}
          </label>
        </>
      )}
      <footer className="performers-list-conversion-drawer__footer">
        <Button buttonStyle="secondary" onClick={onCancel} type="button">
          Cancel
        </Button>
        <Button disabled={!canConfirm} onClick={confirm} type="button">
          Convert
        </Button>
      </footer>
    </div>
  )
}

const PerformersListConversionDrawer: React.FC<PerformersListConversionDrawerProps> = ({
  locale: _locale,
  onCancel,
  onConfirm,
  slug,
  sources,
}) => {
  const { closeModal, modalState } = useModal()
  const wasOpen = React.useRef(Boolean(modalState[slug]?.isOpen))
  const skipNextCloseCancel = React.useRef(false)

  React.useEffect(() => {
    const isOpen = Boolean(modalState[slug]?.isOpen)
    if (wasOpen.current && !isOpen) {
      if (!skipNextCloseCancel.current) onCancel()
      skipNextCloseCancel.current = false
    }
    wasOpen.current = isOpen
  }, [modalState, onCancel, slug])

  const close = (): void => {
    skipNextCloseCancel.current = true
    closeModal(slug)
  }
  const cancel = (): void => {
    close()
    onCancel()
  }
  return (
    <Drawer slug={slug} title="Convert to PerformersList">
      <DrawerForm close={close} onCancel={cancel} onConfirm={onConfirm} sources={sources} />
    </Drawer>
  )
}

export default PerformersListConversionDrawer
