
import { useEffect, useState } from 'react'
import { api } from '../api'

// ── Helpers ────────────────────────────────────────────

const pad = n => String(n).padStart(2, '0')

const nowLocal = () => {
  const d = new Date()

  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const toUTC = value => new Date(value).toISOString()

const formatTime = value => new Date(value).toLocaleTimeString([], {
  hour: '2-digit',
  minute: '2-digit'
})

const formatDate = value => new Date(value).toLocaleDateString([], {
  weekday: 'short',
  day: 'numeric',
  month: 'short'
})

function toDateTimeLocal(date) {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000)
    .toISOString()
    .slice(0, 16);
}

// ── Main page ──────────────────────────────────────────

export default function LogPage() {
  const [baby, setBaby] = useState(null)
  const [types, setTypes] = useState([])
  const [entries, setEntries] = useState([])

  const [selected, setSelected] = useState(null)
  const [editing, setEditing] = useState(null)

  const [startedAt, setStartedAt] = useState(
    toDateTimeLocal(new Date())
  );
  const [endedAt, setEndedAt] = useState('');
  const [notes, setNotes] = useState('')
  const [selections, setSelections] = useState([])

  const [showActivityForm, setShowActivityForm] = useState(false)
  const [activityName, setActivityName] = useState('')
  const [activityTimed, setActivityTimed] = useState(false)
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
    setStartedAt(nowLocal())
    setEndedAt('')
    setNotes('')
    setSelections([])
    setError(null)
  }

  // ── Choose activity ──────────────────────────────────

  const chooseActivity = type => {
    setSelected(type)
    setEditing(null)
    setStartedAt(nowLocal())
    setEndedAt('')
    setNotes('')
    setSelections([])
    setError(null)
  }

  // ── Add an option ──────────────────────────────────────

  const addOption = option => {
    setSelections(previous => [
      ...previous,
      {
        option_id: option.id,
        selected_at: selected.options_have_times
          ? nowLocal()
          : null,
        sort_order: previous.length
      }
    ])
  }

  // ── Remove an option ───────────────────────────────────

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

  // ── Change an option time ───────────────────────────────

  const changeOptionTime = (index, value) => {
    setSelections(previous =>
      previous.map((item, i) =>
        i === index
          ? { ...item, selected_at: value }
          : item
      )
    )
  }

  // ── Save entry ───────────────────────────────────────

  const saveEntry = async () => {
    if (!selected || !baby) return

    if (!startedAt) {
      setError('Please choose an entry time.')
      return
    }

  const chosen = selections.map((item, index) => ({
    ...item,
    sort_order: index,
    selected_at: item.selected_at
      ? toUTC(item.selected_at)
      : null
  }))

    if (selected.options_have_times && chosen.some(
      item => !item.selected_at
    )) {
      setError('Please enter a time for each selected option.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const payload = {
        started_at: toUTC(startedAt),
        ended_at: endedAt ? toUTC(endedAt) : null,
        notes: notes.trim() || null,
        selections: chosen
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

  // ── Edit existing entry ──────────────────────────────

  const editEntry = entry => {
    setSelected(entry.entry_type)
    setEditing(entry)

    setStartedAt(
      toDateTimeLocal(new Date(entry.started_at))
    )

    setEndedAt(
      entry.ended_at
        ? toDateTimeLocal(new Date(entry.ended_at))
        : ''
    )

    setNotes(entry.notes || '')

  const existing = (entry.selections || [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((item, index) => ({
      option_id: item.option_id,
      selected_at: item.selected_at
        ? new Date(item.selected_at).toISOString().slice(0, 16)
        : null,
      sort_order: index
    }))

  setSelections(existing)
    setError(null)
  }

  // ── Delete entry ─────────────────────────────────────

  const deleteEntry = async id => {
    if (!window.confirm('Delete this entry?')) return

    try {
      await api.deleteEntry(id)
      await refresh()
    } catch (err) {
      setError(err.message)
    }
  }

  // ── Create a new activity ────────────────────────────

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
        options
      })

      setActivityName('')
      setActivityOptions('')
      setActivityTimed(false)
      setShowActivityForm(false)

      await refresh()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Main screen ──────────────────────────────────────

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
                  {type.options.length
                    ? type.options.map(o => o.name).join(' · ')
                    : 'New entry'}
                </span>
              </button>
            ))}
          </section>

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

          <section className="activity-history">
            <h2>History</h2>

            {entries.length === 0 && (
              <p className="empty">Nothing logged yet.</p>
            )}

            {entries.map(entry => (
              <article className="history-entry" key={entry.id}>
                <div className="history-entry__header">
                  <div>
                    <strong>{entry.entry_type.name}</strong>
                    <span>
                      {formatDate(entry.started_at)} · {formatTime(entry.started_at)}
                      {entry.ended_at && ` – ${formatTime(entry.ended_at)}`}
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

                {entry.selections?.length > 0 && (
                  <div className="history-entry__details">
                    {entry.selections.map(item => (
                      <span key={item.id}>
                        {item.name}
                        {item.selected_at
                          ? ` · ${formatTime(item.selected_at)}`
                          : ''}
                      </span>
                    ))}
                  </div>
                )}

                {entry.notes && (
                  <p className="history-notes">{entry.notes}</p>
                )}
              </article>
            ))}
          </section>
        </>
      )}

      {selected && (

        <section className="activity-editor">

          <header className="editor-header">
            <div>
              <h2>{editing ? 'Edit entry' : selected.name}</h2>
              <p>
                {editing
                  ? 'Update your logged activity'
                  : 'Record a new activity'}
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

          <div className="field">
            <label>Start time</label>
            <input
              className="input"
              type="datetime-local"
              value={startedAt}
              onChange={e => setStartedAt(e.target.value)}
            />
          </div>

          <div className="field">
            <label>End time (optional)</label>
            <input
              className="input"
              type="datetime-local"
              value={endedAt}
              onChange={e => setEndedAt(e.target.value)}
            />
          </div>

          {selected.options.length > 0 && (
            <div className="field">
              <label>Add actions</label>

              {/* Buttons to add actions repeatedly */}
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

              {/* Ordered list of selected actions */}
              {selections.length > 0 && (
                <div className="selected-options">
                  <label>Selected actions ({selections.length})</label>

                  {selections.map((item, index) => {
                    const option = selected.options.find(
                      o => o.id === item.option_id
                    )

                    return (
                      <div className="option-item selected" key={index}>
                        <div className="option-label">
                          <span>{index + 1}. {option?.name}</span>

                          <button
                            type="button"
                            className="remove-option"
                            onClick={() => removeOption(index)}
                            aria-label={`Remove ${option?.name}`}
                          >
                            ×
                          </button>
                        </div>

                        {selected.options_have_times && (
                          <input
                            className="input option-time"
                            type="datetime-local"
                            value={item.selected_at || ''}
                            onChange={e =>
                              changeOptionTime(index, e.target.value)
                            }
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

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
