
import { useEffect, useState } from 'react'
import { api } from '../api'

// ── Helpers ────────────────────────────────────────────

const pad = n => String(n).padStart(2, '0')

const nowLocalTime = () => {
  const d = new Date()
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const todayLocalDate = () => {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const toUTC = date => date.toISOString()

const formatTime = value => {
  if (!value) return ''

  return new Date(value).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatDate = value => {
  return new Date(value).toLocaleDateString([], {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  })
}

const formatDuration = minutes => {
  if (minutes == null || minutes < 0) return ''

  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60

  if (hours && mins) return `${hours}h ${mins}m`
  if (hours) return `${hours}h`
  return `${mins} min`
}

const getDuration = (start, end) => {
  if (!start || !end) return null

  const difference = Math.round(
    (new Date(end) - new Date(start)) / 60000
  )

  return difference >= 0 ? difference : null
}

// Convert a local date and time into a real Date.
// The browser handles the local timezone.
const localDateTime = (date, time) => {
  if (!date || !time) return null

  return new Date(`${date}T${time}:00`)
}

const isValidDate = date =>
  date instanceof Date && !Number.isNaN(date.getTime())

// Resolve action times in sequence.
// If a time moves backwards, assume the next calendar day.
const resolveActionTimes = (selections, date) => {
  let cursor = localDateTime(date, '00:00')

  return selections.map(item => {
    let started = null
    let ended = null

    if (item.started_time) {
      started = localDateTime(date, item.started_time)

      if (started < cursor) {
        started.setDate(started.getDate() + 1)
      }
    }

    if (item.ended_time) {
      const reference = started || cursor

      ended = localDateTime(
        date,
        item.ended_time
      )

      if (ended < reference) {
        ended.setDate(ended.getDate() + 1)
      }
    }

    if (ended && started && ended < started) {
      ended.setDate(ended.getDate() + 1)
    }

    cursor = ended || started || cursor

    return {
      ...item,
      started_at: isValidDate(started) ? toUTC(started) : null,
      ended_at: isValidDate(ended) ? toUTC(ended) : null
    }
  })
}

// ── Main page ─────────────────────────────────────────

export default function LogPage() {
  const [baby, setBaby] = useState(null)
  const [types, setTypes] = useState([])
  const [entries, setEntries] = useState([])

  const [selected, setSelected] = useState(null)
  const [editing, setEditing] = useState(null)

  const [entryDate, setEntryDate] = useState(todayLocalDate())
  const [entryTime, setEntryTime] = useState(nowLocalTime())
  const [entryEndTime, setEntryEndTime] = useState('')

  const [selections, setSelections] = useState([])
  const [notes, setNotes] = useState('')

  const [showActivityForm, setShowActivityForm] = useState(false)
  const [activityName, setActivityName] = useState('')
  const [activityTimed, setActivityTimed] = useState(false)
  const [activityHasDuration, setActivityHasDuration] = useState(false)
  const [activityOptions, setActivityOptions] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // ── Load data ───────────────────────────────────────

  const refresh = async () => {
    try {
      const [babies, activityTypes, loggedEntries] = await Promise.all([
        api.getBabies(),
        api.getEntryTypes(),
        api.getEntries()
      ])

      setBaby(babies.find(b => b.is_active) || babies[0] || null)
      setTypes(activityTypes)
      setEntries(loggedEntries)
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  // ── Reset editor ────────────────────────────────────

  const reset = () => {
    setSelected(null)
    setEditing(null)
    setEntryDate(todayLocalDate())
    setEntryTime(nowLocalTime())
    setEntryEndTime('')
    setSelections([])
    setNotes('')
    setError(null)
  }

  // ── Choose activity ─────────────────────────────────

  const chooseActivity = type => {
    setSelected(type)
    setEditing(null)
    setEntryDate(todayLocalDate())
    setEntryTime(nowLocalTime())
    setEntryEndTime('')
    setSelections([])
    setNotes('')
    setError(null)
  }

  // ── Add an action ───────────────────────────────────

  const addOption = option => {
    const previous = selections[selections.length - 1]

    // Default the new action's start to the previous
    // action's end, when available.
    const defaultStart = previous?.ended_time || ''

    setSelections(items => [
      ...items,
      {
        option_id: option.id,
        started_time: defaultStart,
        ended_time: '',
        sort_order: items.length
      }
    ])
  }

  // ── Remove an action ────────────────────────────────

  const removeOption = index => {
    setSelections(previous =>
      previous
        .filter((_, i) => i !== index)
        .map((item, i) => ({
          ...item,
          sort_order: i
        }))
    )
  }

  // ── Change an action time ───────────────────────────

  const changeActionTime = (index, field, value) => {
    setSelections(previous =>
      previous.map((item, i) =>
        i === index
          ? { ...item, [field]: value }
          : item
      )
    )
  }

  // ── Save entry ──────────────────────────────────────

  const saveEntry = async () => {
    if (!selected || !baby) return

    setLoading(true)
    setError(null)

    try {
      let payload

      if (selected.slug === 'breastfeeding') {
        if (selections.length === 0) {
          setError('Please add at least one action.')
          setLoading(false)
          return
        }

        const resolved = resolveActionTimes(
          selections,
          entryDate
        )

        // The session timestamp is based on the earliest
        // known action time. If no action has a time,
        // use the manually selected entry time.
        const knownTimes = resolved
          .flatMap(item => [
            item.started_at,
            item.ended_at
          ])
          .filter(Boolean)
          .map(value => new Date(value))

        const earliest = knownTimes.length
          ? new Date(Math.min(...knownTimes.map(d => d.getTime())))
          : new Date()

        if (!isValidDate(earliest)) {
          setError('Please enter a valid feed time.')
          setLoading(false)
          return
        }

        payload = {
          started_at: toUTC(earliest),
          ended_at: null,
          notes: notes.trim() || null,
          selections: resolved.map((item, index) => ({
            option_id: item.option_id,
            started_at: item.started_at,
            ended_at: item.ended_at,
            sort_order: index
          }))
        }
      } else {
        // Simple activities, including nappy changes,
        // use one editable parent-entry timestamp.
        if (!entryTime) {
          setError('Please enter a time.')
          setLoading(false)
          return
        }

        const timestamp = localDateTime(entryDate, entryTime)

        if (!isValidDate(timestamp)) {
          setError('Please enter a valid time.')
          setLoading(false)
          return
        }

        if (selected.slug === 'nappy' && selections.length === 0) {
          setError('Please select at least one option.')
          setLoading(false)
          return
        }

        let endTimestamp = null

        if (selected.has_duration && entryEndTime) {
          endTimestamp = localDateTime(entryDate, entryEndTime)

          // An end time earlier than the start time
          // means the activity crossed midnight.
          if (endTimestamp < timestamp) {
            endTimestamp.setDate(endTimestamp.getDate() + 1)
          }
        }

        payload = {
          started_at: toUTC(timestamp),
          ended_at: endTimestamp ? toUTC(endTimestamp) : null,
          notes: notes.trim() || null,
          selections: selections.map((item, index) => ({
            option_id: item.option_id,
            started_at: null,
            ended_at: null,
            sort_order: index
          }))
        }
      }

      if (editing) {
        await api.updateEntry(editing.id, payload)
      } else {
        await api.createEntry({
          baby_id: baby.id,
          entry_type_id: selected.id,
          ...payload
        })
      }

      await refresh()
      reset()

    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Edit existing entry ─────────────────────────────

  const editEntry = entry => {
    setSelected(entry.entry_type)
    setEditing(entry)

    const entryDateValue = new Date(entry.started_at)

    // Keep the date internally for timestamp conversion.
    setEntryDate(
      `${entryDateValue.getFullYear()}-${pad(entryDateValue.getMonth() + 1)}-${pad(entryDateValue.getDate())}`
    )

    setEntryTime(
      `${pad(entryDateValue.getHours())}:${pad(entryDateValue.getMinutes())}`
    )

    setEntryEndTime(
      entry.ended_at
        ? `${pad(new Date(entry.ended_at).getHours())}:${pad(new Date(entry.ended_at).getMinutes())}`
        : ''
    )

    setNotes(entry.notes || '')

    const existing = (entry.selections || [])
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((item, index) => {
        const start = item.started_at
          ? new Date(item.started_at)
          : null

        const end = item.ended_at
          ? new Date(item.ended_at)
          : null

        return {
          option_id: item.option_id,
          started_time: start
            ? `${pad(start.getHours())}:${pad(start.getMinutes())}`
            : '',
          ended_time: end
            ? `${pad(end.getHours())}:${pad(end.getMinutes())}`
            : '',
          sort_order: index
        }
      })

    setSelections(existing)
    setError(null)
  }

  // ── Delete entry ────────────────────────────────────

  const deleteEntry = async id => {
    if (!window.confirm('Delete this entry?')) return

    try {
      await api.deleteEntry(id)
      await refresh()
    } catch (err) {
      setError(err.message)
    }
  }

  // ── Create a custom activity ────────────────────────

  const createActivity = async () => {
    const name = activityName.trim()

    if (!name) {
      setError('Please enter an activity name.')
      return
    }

    const options = activityOptions
      .split(',')
      .map(name => name.trim())
      .filter(Boolean)
      .map((name, index) => ({
        name,
        sort_order: index
      }))

    setLoading(true)
    setError(null)

    try {
      await api.createEntryType({
        name,
        options_have_times: activityTimed,
        has_duration: activityHasDuration,
        options
      })

      setActivityName('')
      setActivityOptions('')
      setActivityTimed(false)
      setActivityHasDuration(false)
      setShowActivityForm(false)

      await refresh()

    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Main screen ─────────────────────────────────────

  return (
    <div className="page">

      <header className="page-header">
        <div>
          <h1>Baby Logger</h1>
          <p>{baby?.name || 'Baby'}'s daily log</p>
        </div>

        <button
          className="refresh-button"
          onClick={refresh}
          disabled={loading}
        >
          ↻
        </button>
      </header>

      {error && <p className="error">{error}</p>}

      {!selected && (
        <>
          {/* Main activities */}

          <section className="primary-actions">
            {types.map(type => (
              <button
                key={type.id}
                className={`primary-action ${
                  type.slug === 'breastfeeding'
                    ? 'primary-action--feed'
                    : type.slug === 'nappy'
                      ? 'primary-action--nappy'
                      : 'primary-action--user'
                }`}
                onClick={() => chooseActivity(type)}
              >
                <strong>{type.name}</strong>
                <span>
                  {type.slug === 'breastfeeding'
                    ? 'Log a feed'
                    : type.slug === 'nappy'
                      ? 'Log a nappy change'
                      : 'Log a ' + type.name.toLowerCase()}
                </span>
              </button>
            ))}
          </section>

          {/* Future custom activity creation */}

          <section className="other-activities">
            <button
              className="activity-button"
              onClick={() => {
                setShowActivityForm(!showActivityForm)
                setError(null)
              }}
            >
              {showActivityForm ? 'Cancel' : '+ Add activity'}
            </button>

            {showActivityForm && (
              <div className="editor">
                <h2>New activity</h2>

                <div className="field">
                  <label>Activity name</label>
                  <input
                    className="input"
                    value={activityName}
                    onChange={e => setActivityName(e.target.value)}
                    placeholder="e.g. Sleep"
                  />
                </div>

                <div className="field">
                  <label>Options</label>
                  <input
                    className="input"
                    value={activityOptions}
                    onChange={e => setActivityOptions(e.target.value)}
                    placeholder="e.g. Nap, Night sleep"
                  />
                  <small>Separate options with commas.</small>
                </div>

                <div className="field">
                  <label className="check-field">
                    <input
                      type="checkbox"
                      checked={activityTimed}
                      onChange={e => setActivityTimed(e.target.checked)}
                    />
                    Each option has its own time
                  </label>
                </div>

                <div className="field">
                  <label className="check-field">
                    <input
                      type="checkbox"
                      checked={activityHasDuration}
                      onChange={e => setActivityHasDuration(e.target.checked)}
                    />
                    This activity has a start and end time
                  </label>
                </div>

                <button
                  className="btn-submit"
                  onClick={createActivity}
                  disabled={loading}
                >
                  {loading ? 'Creating...' : 'Create activity'}
                </button>
              </div>
            )}
          </section>

          {/* History */}

          <section className="activity-history">
            <h2>History</h2>

            {entries.length === 0 && (
              <p className="empty">Nothing logged yet.</p>
            )}

            {entries.map(entry => {
              const isBreastfeeding =
                entry.entry_type.slug === 'breastfeeding'

              const isDurationActivity =
                entry.entry_type.has_duration

              const ordered = (entry.selections || [])
                .slice()
                .sort((a, b) => a.sort_order - b.sort_order)

              // Only count actual breastfeeding time.
              // Burping should not inflate the feeding duration.
              const durations = ordered
                .filter(item =>
                  ['left', 'right'].includes(item.name.toLowerCase())
                )
                .map(item => getDuration(
                  item.started_at,
                  item.ended_at
                ))
                .filter(value => value !== null)

              const totalDuration = durations.length
                ? durations.reduce((sum, value) => sum + value, 0)
                : null

              return (
                <article className="history-entry" key={entry.id}>

                  <div className="history-entry__header">
                    <div>
                      <strong>{entry.entry_type.name}</strong>

                      <span>
                        {formatDate(entry.started_at)}
                        {' · '}
                        {formatTime(entry.started_at)}

                        {isBreastfeeding && totalDuration !== null
                          ? ` · ${formatDuration(totalDuration)}`
                          : isDurationActivity && entry.ended_at
                            ? ` · ${formatDuration(
                                getDuration(entry.started_at, entry.ended_at)
                              )}`
                            : ''}
                      </span>
                    </div>

                    <div className="history-entry__actions">
                      <button onClick={() => editEntry(entry)}>
                        Edit
                      </button>

                      <button onClick={() => deleteEntry(entry.id)}>
                        ×
                      </button>
                    </div>
                  </div>

                  {ordered.length > 0 && (
                    <div className="history-entry__details">
                      {ordered.map(item => {
                        const duration = getDuration(
                          item.started_at,
                          item.ended_at
                        )

                        if (isBreastfeeding) {
                          const times = []

                          if (item.started_at) {
                            times.push(formatTime(item.started_at))
                          }

                          if (item.ended_at) {
                            times.push(formatTime(item.ended_at))
                          }

                          return (
                            <span key={item.id}>
                              {item.name}
                              {times.length
                                ? ` · ${times.join(' – ')}`
                                : ''}
                              {duration !== null
                                ? ` · ${formatDuration(duration)}`
                                : ''}
                            </span>
                          )
                        }

                        return (
                          <span key={item.id}>
                            {item.name}
                          </span>
                        )
                      })}
                    </div>
                  )}

                  {entry.notes && (
                    <p className="history-notes">
                      {entry.notes}
                    </p>
                  )}

                </article>
              )
            })}
          </section>
        </>
      )}

      {/* Activity editor */}

      {selected && (
        <section className="activity-editor">

          <header className="editor-header">
            <div>
              <h2>
                {editing ? 'Edit entry' : selected.name}
              </h2>

              <p>
                {editing
                  ? 'Update your logged activity'
                  : selected.slug === 'breastfeeding'
                    ? 'Add each part of the feed'
                    : selected.slug === 'nappy'
                      ? 'Record a nappy change'
                      : `Record a ${selected.name.toLowerCase()}`}
              </p>
            </div>

            <button
              className="close-button"
              onClick={reset}
              disabled={loading}
            >
              ×
            </button>
          </header>

          {/* Breastfeeding editor */}

          {selected.slug === 'breastfeeding' && (
            <>
              <div className="field">
                <label>Feed date</label>
                <input
                  className="input"
                  type="date"
                  value={entryDate}
                  onChange={e => setEntryDate(e.target.value)}
                />
                <small>
                  Used internally to work out the dates of each action.
                </small>
              </div>

              <div className="field">
                <label>Feed actions</label>

                <div className="option-list">
                  {selected.options
                    .filter(option => option.is_active)
                    .map(option => (
                      <button
                        type="button"
                        className="option-item"
                        key={option.id}
                        onClick={() => addOption(option)}
                      >
                        + {option.name}
                      </button>
                    ))}
                </div>
              </div>

              {selections.length > 0 && (
                <div className="selected-options">

                  <label>
                    Actions ({selections.length})
                  </label>

                  {selections.map((item, index) => {
                    const option = selected.options.find(
                      o => o.id === item.option_id
                    )

                    return (
                      <div
                        className="option-item selected"
                        key={`${item.option_id}-${index}`}
                      >
                        <div className="option-label">
                          <strong>
                            {index + 1}. {option?.name}
                          </strong>

                          <button
                            type="button"
                            className="remove-option"
                            onClick={() => removeOption(index)}
                            aria-label={`Remove ${option?.name}`}
                          >
                            ×
                          </button>
                        </div>

                        <div className="field">
                          <label>Start time</label>
                          <input
                            className="input option-time"
                            type="time"
                            value={item.started_time}
                            onChange={e =>
                              changeActionTime(
                                index,
                                'started_time',
                                e.target.value
                              )
                            }
                          />
                        </div>

                        <div className="field">
                          <label>End time</label>
                          <input
                            className="input option-time"
                            type="time"
                            value={item.ended_time}
                            onChange={e =>
                              changeActionTime(
                                index,
                                'ended_time',
                                e.target.value
                              )
                            }
                          />
                        </div>

                        {item.started_time && item.ended_time && (
                          <small>
                            Duration:{' '}
                            {(() => {
                              let start = localDateTime(
                                entryDate,
                                item.started_time
                              )

                              let end = localDateTime(
                                entryDate,
                                item.ended_time
                              )

                              if (end < start) {
                                end.setDate(end.getDate() + 1)
                              }

                              return formatDuration(
                                Math.round(
                                  (end - start) / 60000
                                )
                              )
                            })()}
                          </small>
                        )}
                      </div>
                    )
                  })}

                </div>
              )}

            </>
          )}

          {/* Nappy editor */}

          {selected.slug === 'nappy' && (
            <>
              <div className="field">
                <label>Time</label>
                <input
                  className="input"
                  type="time"
                  value={entryTime}
                  onChange={e => setEntryTime(e.target.value)}
                />
              </div>

              <div className="field">
                <label>What was in the nappy?</label>

                <div className="option-list">
                  {selected.options
                    .filter(option => option.is_active)
                    .map(option => {
                      const active = selections.some(
                        item => item.option_id === option.id
                      )

                      return (
                        <button
                          type="button"
                          key={option.id}
                          className={`option-item ${active ? 'selected' : ''}`}
                          onClick={() => {
                            setSelections(previous => {
                              if (active) {
                                return previous
                                  .filter(item => item.option_id !== option.id)
                                  .map((item, index) => ({
                                    ...item,
                                    sort_order: index
                                  }))
                              }

                              return [
                                ...previous,
                                {
                                  option_id: option.id,
                                  started_time: '',
                                  ended_time: '',
                                  sort_order: previous.length
                                }
                              ]
                            })
                          }}
                        >
                          {active ? '✓ ' : '+ '}
                          {option.name}
                        </button>
                      )
                    })}
                </div>
              </div>
            </>
          )}


          {/* Generic custom activity editor */}

          {!['breastfeeding', 'nappy'].includes(selected.slug) && (
            <>
              <div className="field">
                <label>Date</label>
                <input
                  className="input"
                  type="date"
                  value={entryDate}
                  onChange={e => setEntryDate(e.target.value)}
                />
              </div>

              <div className="field">
                <label>Time</label>
                <input
                  className="input"
                  type="time"
                  value={entryTime}
                  onChange={e => setEntryTime(e.target.value)}
                />
              </div>

              {selected.has_duration && (
                <div className="field">
                  <label>End time (optional)</label>
                  <input
                    className="input"
                    type="time"
                    value={entryEndTime}
                    onChange={e => setEntryEndTime(e.target.value)}
                  />
                  <small>
                    Leave blank if the activity hasn't finished yet.
                  </small>
                </div>
              )}

              {selected.options?.filter(option => option.is_active).length > 0 && (
                <div className="field">
                  <label>Details</label>

                  <div className="option-list">
                    {selected.options
                      .filter(option => option.is_active)
                      .map(option => {
                        const active = selections.some(
                          item => item.option_id === option.id
                        )

                        return (
                          <button
                            type="button"
                            key={option.id}
                            className={`option-item ${active ? 'selected' : ''}`}
                            onClick={() => {
                              setSelections(previous => {
                                if (active) {
                                  return previous.filter(
                                    item => item.option_id !== option.id
                                  )
                                }

                                return [
                                  ...previous,
                                  {
                                    option_id: option.id,
                                    started_time: '',
                                    ended_time: '',
                                    sort_order: previous.length
                                  }
                                ]
                              })
                            }}
                          >
                            {active ? '✓ ' : '+ '}
                            {option.name}
                          </button>
                        )
                      })}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Notes */}

          <div className="field">
            <label>Notes (optional)</label>

            <textarea
              className="input notes-input"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add any extra details..."
              rows={3}
            />
          </div>

          {/* Actions */}

          <div className="editor-actions">
            <button
              className="btn-cancel"
              onClick={reset}
              disabled={loading}
            >
              Cancel
            </button>

            <button
              className="btn-submit"
              onClick={saveEntry}
              disabled={loading}
            >
              {loading
                ? 'Saving...'
                : editing
                  ? 'Update entry'
                  : 'Save entry'}
            </button>
          </div>

        </section>
      )}

    </div>
  )
}
