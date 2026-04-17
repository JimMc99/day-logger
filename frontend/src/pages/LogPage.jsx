import { useState, useEffect, useRef } from 'react'
import { api } from '../api'

const pad = n => String(n).padStart(2, '0')
const nowLocal = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}` }
const toUTC = ts => new Date(ts).toISOString()
const cap = s => s.trim().charAt(0).toUpperCase() + s.trim().slice(1)

function formatTime(ts) {
  const d = new Date(ts.endsWith('Z') ? ts : ts + 'Z')
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return d.toDateString() === new Date().toDateString()
    ? time
    : d.toLocaleDateString([], { day: 'numeric', month: 'short' }) + ' · ' + time
}

export default function LogPage() {
  const [cats, setCats] = useState([])
  const [tags, setTags] = useState([])
  const [popular, setPopular] = useState([])
  const [entries, setEntries] = useState([])
  const [title, setTitle] = useState('')
  const [time, setTime] = useState(nowLocal())
  const [picked, setPicked] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [openCat, setOpenCat] = useState(null)
  const [detailFor, setDetailFor] = useState(null)
  const [detailVal, setDetailVal] = useState('')
  const wrap = useRef(null)

  useEffect(() => {
    api.getCategories().then(setCats).catch(() => {})
    api.getTags().then(setTags).catch(() => {})
    api.getPopular().then(setPopular).catch(() => {})
    api.getEntries().then(setEntries).catch(() => {})
    const close = e => { if (wrap.current && !wrap.current.contains(e.target)) { setOpen(false); setOpenCat(null) } }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const q = query.trim().toLowerCase()
  const isNew = q && !tags.some(t => t.name.toLowerCase() === q)
  const matches = q ? tags.filter(t => t.name.toLowerCase().includes(q) && !picked.some(p => p.tag_id === t.id)) : []

  const addTag = (tag, keep = false) => {
    setPicked(prev => [...prev, { tag_id: tag.id, name: tag.name, cat: tag.category.name, detail: '' }])
    setQuery('')
    if (!keep) setOpen(false)
  }

  const addNew = async cat => {
    const tag = await api.createTag({ name: cap(query), category_id: cat.id })
    if (tag) { setTags(prev => [...prev, tag]); addTag(tag) }
    setQuery('')
  }

  const removeTag = idx => { setPicked(prev => prev.filter((_, i) => i !== idx)); if (detailFor === idx) setDetailFor(null) }

  const saveDetail = idx => { setPicked(prev => prev.map((p, i) => i === idx ? { ...p, detail: detailVal.trim() } : p)); setDetailFor(null) }

  const refreshPopular = () => api.getPopular().then(setPopular).catch(() => {})

  const handleSubmit = async e => {
    e.preventDefault()
    if (!title.trim() && picked.length === 0) { setError('Add a title or at least one tag'); return }
    setSaving(true); setError(null)
    try {
      const entry = await api.createEntry({
        title: title.trim() || null,
        timestamp: toUTC(time),
        tags: picked.map(p => ({ tag_id: p.tag_id, detail: p.detail || null })),
      })
      if (entry) { setEntries(prev => [entry, ...prev]); refreshPopular() }
      setTitle(''); setTime(nowLocal()); setPicked([]); setQuery('')
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async id => {
    await api.deleteEntry(id)
    setEntries(prev => prev.filter(e => e.id !== id))
    refreshPopular()
  }

  const avail = t => !picked.some(p => p.tag_id === t.id)

  return (
    <div className="page">
      <form className="log-form" onSubmit={handleSubmit}>

        <input className="input" type="text" placeholder="What's happening? (e.g. Dinner, Woke up…)"
          value={title} onChange={e => setTitle(e.target.value)} />

        <input className="input input--time" type="datetime-local"
          value={time} onChange={e => setTime(e.target.value)} />

        <div className="tag-input-wrap" ref={wrap}>

          {picked.length > 0 && (
            <div className="tags">
              {picked.map((p, i) => (
                <div key={i} className="tag-wrap">
                  <div className={`tag tag--${p.cat.toLowerCase()}`}>
                    <span className="tag__name" onClick={() => { if (detailFor === i) setDetailFor(null); else { setDetailFor(i); setDetailVal(p.detail || '') } }}>
                      {p.name}{p.detail ? <em className="tag__detail-preview"> · {p.detail}</em> : <span className="tag__add-detail"> +detail</span>}
                    </span>
                    <button type="button" className="tag__remove" onClick={() => removeTag(i)}>×</button>
                  </div>
                  {detailFor === i && (
                    <div className="tag-detail-input">
                      <input autoFocus className="input input--sm" type="text" placeholder={`Detail for ${p.name}…`}
                        value={detailVal} onChange={e => setDetailVal(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') saveDetail(i); if (e.key === 'Escape') setDetailFor(null) }} />
                      <button type="button" className="btn-inline" onClick={() => saveDetail(i)}>Save</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <input className="input" type="text" autoComplete="off"
            placeholder="Add a tag… (e.g. Coffee, Tired, Run)"
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true) }}
            onClick={() => setOpen(true)} />

          {open && (
            <div className="dropdown">
              {q ? (
                <>
                  {matches.map(t => (
                    <button key={t.id} type="button" className="dropdown__item"
                      onMouseDown={e => e.preventDefault()} onClick={() => addTag(t)}>
                      <span>{t.name}</span>
                      <span className={`dropdown__cat dropdown__cat--${t.category.name.toLowerCase()}`}>{t.category.name}</span>
                    </button>
                  ))}
                  {isNew && (
                    <div className="dropdown__new">
                      <span className="dropdown__new-label">Add "{cap(query)}" as:</span>
                      <div className="dropdown__cats">
                        {cats.map(c => (
                          <button key={c.id} type="button"
                            className={`dropdown__cat-btn dropdown__cat-btn--${c.name.toLowerCase()}`}
                            onMouseDown={e => e.preventDefault()} onClick={() => addNew(c)}>{c.name}</button>
                        ))}
                      </div>
                    </div>
                  )}
                  {!matches.length && !isNew && <div className="dropdown__heading">No matches</div>}
                </>
              ) : (
                <div className="dropdown__browser">
                  <div className="dropdown__browser-cats">
                    {cats.map(c => (
                      <button key={c.id} type="button"
                        className={`dropdown__browser-btn dropdown__browser-btn--${c.name.toLowerCase()}${openCat === c.id ? ' dropdown__browser-btn--open' : ''}`}
                        onMouseDown={e => e.preventDefault()} onClick={() => setOpenCat(openCat === c.id ? null : c.id)}>
                        {c.name} {openCat === c.id ? '▴' : '▾'}
                      </button>
                    ))}
                  </div>
                  {openCat && (
                    <div className="dropdown__browser-tags">
                      {tags.filter(t => t.category.id === openCat && avail(t)).map(t => (
                        <button key={t.id} type="button" className={`chip chip--${t.category.name.toLowerCase()}`}
                          onMouseDown={e => e.preventDefault()} onClick={() => addTag(t, true)}>{t.name}</button>
                      ))}
                    </div>
                  )}
                  {!openCat && popular.filter(avail).length > 0 && (
                    <>
                      <div className="dropdown__heading">Recently used</div>
                      {popular.filter(avail).map(t => (
                        <button key={t.id} type="button" className="dropdown__item"
                          onMouseDown={e => e.preventDefault()} onClick={() => addTag(t)}>
                          <span>{t.name}</span>
                          <span className={`dropdown__cat dropdown__cat--${t.category.name.toLowerCase()}`}>{t.category.name}</span>
                        </button>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {error && <p className="error">{error}</p>}
        <button className="btn-submit" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Log'}</button>
      </form>

      <div className="entry-list">
        {!entries.length && <p className="empty">Nothing logged yet.</p>}
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
                    {et.tag.name}{et.detail && <em className="tag__detail-preview"> · {et.detail}</em>}
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
