import { useState, useEffect, useRef } from 'react'
import { api } from '../api'

function capitaliseFirst(str) {
    const s = str.trim(); return s.charAt(0).toUpperCase() + s.slice(1)
}

function nowLocalInput() {
  const d = new Date()
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function formatTime(ts) {
  // Parse as UTC and display in the user's local timezone
  const d = new Date(ts.endsWith('Z') ? ts : ts + 'Z')
  const today = new Date()
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return d.toDateString() === today.toDateString()
    ? time
    : d.toLocaleDateString([], { day: 'numeric', month: 'short' }) + ' · ' + time
}

// ── Tag input ─────────────────────────────────────────────────────────────────

function TagInput({ factors, categories, tags, onChange, onNewFactor }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [noteFor, setNoteFor] = useState(null) // index of tag being annotated
  const [noteVal, setNoteVal] = useState('')
  const inputRef = useRef(null)
  const dropRef = useRef(null)

  const q = query.trim().toLowerCase()
  const suggestions = q.length === 0 ? [] : factors.filter(f =>
    f.name.toLowerCase().includes(q) && !tags.some(t => t.factor_id === f.id)
  )
  const isNew = q.length > 0 && !factors.some(f => f.name.toLowerCase() === q)

  function addExisting(factor) {
    onChange([...tags, { factor_id: factor.id, name: factor.name, category: factor.category.name, note: '' }])
    setQuery('')
    setOpen(false)
    inputRef.current?.focus()
  }

  async function addNew(category) {
    const name = capitaliseFirst(query)
    const factor = await onNewFactor(name, category.id)
    if (factor) {
      onChange([...tags, { factor_id: factor.id, name: factor.name, category: category.name, note: '' }])
    }
    setQuery('')
    setOpen(false)
    inputRef.current?.focus()
  }

  function removeTag(idx) {
    onChange(tags.filter((_, i) => i !== idx))
    if (noteFor === idx) setNoteFor(null)
  }

  function openNote(idx) {
    setNoteFor(idx)
    setNoteVal(tags[idx].note || '')
  }

  function saveNote(idx) {
    onChange(tags.map((t, i) => i === idx ? { ...t, note: noteVal.trim() } : t))
    setNoteFor(null)
  }

  useEffect(() => {
    function handler(e) {
      if (!dropRef.current?.contains(e.target) && e.target !== inputRef.current) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="tag-input-wrap">
      {tags.length > 0 && (
        <div className="tags">
          {tags.map((tag, idx) => (
            <div key={idx} className="tag-wrap">
              <div className={`tag tag--${tag.category.toLowerCase()}`}>
                <span className="tag__name" onClick={() => noteFor === idx ? setNoteFor(null) : openNote(idx)}>
                  {tag.name}{tag.note ? <em className="tag__note-preview"> · {tag.note}</em> : <span className="tag__add-note"> +note</span>}
                </span>
                <button type="button" className="tag__remove" onClick={() => removeTag(idx)}>×</button>
              </div>
              {noteFor === idx && (
                <div className="tag-note-input">
                  <input
                    autoFocus
                    className="input input--sm"
                    type="text"
                    placeholder={`Note for ${tag.name}… (e.g. 45 mins, Margherita)`}
                    value={noteVal}
                    onChange={e => setNoteVal(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveNote(idx); if (e.key === 'Escape') setNoteFor(null) }}
                  />
                  <button type="button" className="btn-inline" onClick={() => saveNote(idx)}>Save</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <input
        ref={inputRef}
        className="input"
        type="text"
        placeholder="Add a factor… (e.g. Pizza, Tired, Running)"
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => { if (query) setOpen(true) }}
        autoComplete="off"
      />

      {open && (suggestions.length > 0 || isNew) && (
        <div className="dropdown" ref={dropRef}>
          {suggestions.map(f => (
            <button key={f.id} type="button" className="dropdown__item" onClick={() => addExisting(f)}>
              <span>{f.name}</span>
              <span className={`dropdown__cat dropdown__cat--${f.category.name.toLowerCase()}`}>{f.category.name}</span>
            </button>
          ))}
          {isNew && (
            <div className="dropdown__new">
              <span className="dropdown__new-label">Add "{capitaliseFirst(query)}" as:</span>
              <div className="dropdown__cats">
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    className={`dropdown__cat-btn dropdown__cat-btn--${cat.name.toLowerCase()}`}
                    onClick={() => addNew(cat)}
                  >{cat.name}</button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function LogPage() {
  const [categories, setCategories] = useState([])
  const [factors, setFactors] = useState([])
  const [entries, setEntries] = useState([])
  const [label, setLabel] = useState('')
  const [time, setTime] = useState(nowLocalInput())
  const [tags, setTags] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.getCategories().then(setCategories).catch(() => {})
    api.getFactors().then(setFactors).catch(() => {})
    api.getEntries().then(setEntries).catch(() => {})
  }, [])

  async function handleNewFactor(name, categoryId) {
    const factor = await api.createFactor({ name, category_id: categoryId })
    if (factor) setFactors(prev => [...prev, factor])
    return factor
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!label.trim() && tags.length === 0) {
      setError('Add a label or at least one factor')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const entry = await api.createEntry({
        note: label.trim() || null,
        timestamp: new Date(time).toISOString(),
        factors: tags.map(t => ({
          factor_id: t.factor_id,
          note: t.note || null,
        })),
      })
      if (entry) setEntries(prev => [entry, ...prev])
      setLabel('')
      setTime(nowLocalInput())
      setTags([])
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    await api.deleteEntry(id)
    setEntries(prev => prev.filter(e => e.id !== id))
  }

  return (
    <div className="page">
      <form className="log-form" onSubmit={handleSubmit}>
        <input
          className="input"
          type="text"
          placeholder="Label (e.g. Dinner, Morning run, Woke up…)"
          value={label}
          onChange={e => setLabel(e.target.value)}
        />

        <input
          className="input input--time"
          type="datetime-local"
          value={time}
          onChange={e => setTime(e.target.value)}
        />

        <TagInput
          factors={factors}
          categories={categories}
          tags={tags}
          onChange={setTags}
          onNewFactor={handleNewFactor}
        />

        {error && <p className="error">{error}</p>}

        <button className="btn-submit" type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Log'}
        </button>
      </form>

      <div className="entry-list">
        {entries.length === 0 && <p className="empty">Nothing logged yet.</p>}
        {entries.map(entry => (
          <div key={entry.id} className="entry">
            <div className="entry__top">
              <span className="entry__time">{formatTime(entry.timestamp)}</span>
              <button className="entry__delete" onClick={() => handleDelete(entry.id)}>✕</button>
            </div>
            {entry.note && <p className="entry__note">{entry.note}</p>}
            {entry.factors.length > 0 && (
              <div className="entry__tags">
                {entry.factors.map(ef => (
                  <span key={ef.id} className={`tag tag--static tag--${ef.factor.category.name.toLowerCase()}`}>
                    <span className="tag__name">
                      {ef.factor.name}
                      {ef.note && <em className="tag__note-preview"> · {ef.note}</em>}
                    </span>
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
