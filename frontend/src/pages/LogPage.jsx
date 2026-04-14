import { useState, useEffect, useRef } from 'react'
import { api } from '../api'

function capitaliseFirst(str) {
  const s = str.trim()
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function nowLocalInput() {
  const d = new Date()
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function formatTime(ts) {
  const d = new Date(ts.endsWith('Z') ? ts : ts + 'Z')
  const today = new Date()
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return d.toDateString() === today.toDateString()
    ? time
    : d.toLocaleDateString([], { day: 'numeric', month: 'short' }) + ' · ' + time
}

// ── Tag input ─────────────────────────────────────────────────────────────────

function TagInput({ tags: allTags, popular, categories, selected, onChange, onNewTag }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [detailFor, setDetailFor] = useState(null)
  const [detailVal, setDetailVal] = useState('')
  const inputRef = useRef(null)
  const dropRef = useRef(null)

  const q = query.trim().toLowerCase()

  const suggestions = q.length === 0
    ? popular.filter(t => !selected.some(s => s.tag_id === t.id))
    : allTags.filter(t =>
        t.name.toLowerCase().includes(q) && !selected.some(s => s.tag_id === t.id)
      )

  const isNew = q.length > 0 && !allTags.some(t => t.name.toLowerCase() === q)

  function addExisting(tag) {
    onChange([...selected, { tag_id: tag.id, name: tag.name, category: tag.category.name, detail: '' }])
    setQuery('')
    setOpen(false)
    inputRef.current?.focus()
  }

  async function addNew(category) {
    const name = capitaliseFirst(query)
    const tag = await onNewTag(name, category.id)
    if (tag) {
      onChange([...selected, { tag_id: tag.id, name: tag.name, category: tag.category.name, detail: '' }])
    }
    setQuery('')
    setOpen(false)
    inputRef.current?.focus()
  }

  function removeSelected(idx) {
    onChange(selected.filter((_, i) => i !== idx))
    if (detailFor === idx) setDetailFor(null)
  }

  function openDetail(idx) {
    setDetailFor(idx)
    setDetailVal(selected[idx].detail || '')
  }

  function saveDetail(idx) {
    onChange(selected.map((s, i) => i === idx ? { ...s, detail: detailVal.trim() } : s))
    setDetailFor(null)
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
      {selected.length > 0 && (
        <div className="tags">
          {selected.map((s, idx) => (
            <div key={idx} className="tag-wrap">
              <div className={`tag tag--${s.category.toLowerCase()}`}>
                <span className="tag__name" onClick={() => detailFor === idx ? setDetailFor(null) : openDetail(idx)}>
                  {s.name}
                  {s.detail
                    ? <em className="tag__detail-preview"> · {s.detail}</em>
                    : <span className="tag__add-detail"> +detail</span>
                  }
                </span>
                <button type="button" className="tag__remove" onClick={() => removeSelected(idx)}>×</button>
              </div>
              {detailFor === idx && (
                <div className="tag-detail-input">
                  <input
                    autoFocus
                    className="input input--sm"
                    type="text"
                    placeholder={`Detail for ${s.name}… (e.g. 45 mins, with milk)`}
                    value={detailVal}
                    onChange={e => setDetailVal(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') saveDetail(idx)
                      if (e.key === 'Escape') setDetailFor(null)
                    }}
                  />
                  <button type="button" className="btn-inline" onClick={() => saveDetail(idx)}>Save</button>
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
        placeholder="Add a tag… (e.g. Coffee, Tired, Run)"
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        autoComplete="off"
      />

      {open && suggestions.length > 0 && (
        <div className="dropdown" ref={dropRef}>
          {q.length === 0 && <div className="dropdown__heading">Recently used</div>}
          {suggestions.map(t => (
            <button key={t.id} type="button" className="dropdown__item" onClick={() => addExisting(t)}>
              <span>{t.name}</span>
              <span className={`dropdown__cat dropdown__cat--${t.category.name.toLowerCase()}`}>
                {t.category.name}
              </span>
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

      {open && q.length > 0 && suggestions.length === 0 && !isNew && (
        <div className="dropdown">
          <div className="dropdown__heading">No matches</div>
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function LogPage() {
  const [categories, setCategories] = useState([])
  const [allTags, setAllTags] = useState([])
  const [popular, setPopular] = useState([])
  const [entries, setEntries] = useState([])
  const [title, setTitle] = useState('')
  const [time, setTime] = useState(nowLocalInput())
  const [selected, setSelected] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.getCategories().then(setCategories).catch(() => {})
    api.getTags().then(setAllTags).catch(() => {})
    api.getPopular().then(setPopular).catch(() => {})
    api.getEntries().then(setEntries).catch(() => {})
  }, [])

  function refreshPopular() {
    api.getPopular().then(setPopular).catch(() => {})
  }

  async function handleNewTag(name, categoryId) {
    const tag = await api.createTag({ name, category_id: categoryId })
    if (tag) setAllTags(prev => [...prev, tag])
    return tag
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim() && selected.length === 0) {
      setError('Add a title or at least one tag')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const entry = await api.createEntry({
        title: title.trim() || null,
        timestamp: new Date(time).toISOString(),
        tags: selected.map(s => ({
          tag_id: s.tag_id,
          detail: s.detail || null,
        })),
      })
      if (entry) {
        setEntries(prev => [entry, ...prev])
        refreshPopular()
      }
      setTitle('')
      setTime(nowLocalInput())
      setSelected([])
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    await api.deleteEntry(id)
    setEntries(prev => prev.filter(e => e.id !== id))
    refreshPopular()
  }

  return (
    <div className="page">
      <form className="log-form" onSubmit={handleSubmit}>
        <input
          className="input"
          type="text"
          placeholder="What's happening? (e.g. Dinner, Woke up, Morning run…)"
          value={title}
          onChange={e => setTitle(e.target.value)}
        />

        <input
          className="input input--time"
          type="datetime-local"
          value={time}
          onChange={e => setTime(e.target.value)}
        />

        <TagInput
          tags={allTags}
          popular={popular}
          categories={categories}
          selected={selected}
          onChange={setSelected}
          onNewTag={handleNewTag}
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
            {entry.title && <p className="entry__title">{entry.title}</p>}
            {entry.tags.length > 0 && (
              <div className="entry__tags">
                {entry.tags.map(et => (
                  <span key={et.id} className={`tag tag--static tag--${et.tag.category.name.toLowerCase()}`}>
                    <span className="tag__name">
                      {et.tag.name}
                      {et.detail && <em className="tag__detail-preview"> · {et.detail}</em>}
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
