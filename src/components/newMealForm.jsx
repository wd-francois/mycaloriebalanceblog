import { useState } from "react";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,400&display=swap');

  .meal-form-root * { font-family: 'DM Sans', sans-serif; box-sizing: border-box; }

  .meal-form-root {
    --amber: #f59e0b;
    --amber-light: #fef3c7;
    --amber-dark: #d97706;
    --green: #10b981;
    --blue: #3b82f6;
    --rose: #f43f5e;
    --surface: #ffffff;
    --surface-muted: #fafaf9;
    --border: #e8e3dc;
    --text-primary: #1c1917;
    --text-secondary: #78716c;
    --text-tertiary: #a8a29e;
    --radius: 14px;
    width: 100%;
    max-width: 560px;
    margin: 0 auto;
    padding: 32px 16px 48px;
  }

  .mf-eyebrow {
    font-family: 'Syne', sans-serif;
    font-size: 11px; font-weight: 700;
    letter-spacing: 0.12em; text-transform: uppercase;
    color: var(--amber-dark); margin-bottom: 6px;
  }
  .mf-title {
    font-family: 'Syne', sans-serif;
    font-size: 28px; font-weight: 800;
    color: var(--text-primary); line-height: 1.15;
    margin: 0 0 6px;
  }
  .mf-subtitle { font-size: 14px; color: var(--text-secondary); margin: 0 0 28px; }

  .mf-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 20px; overflow: hidden;
    box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  }
  .mf-card-body { padding: 28px; }

  .mf-section { margin-bottom: 32px; }
  .mf-section:last-child { margin-bottom: 0; }

  .mf-section-header { display: flex; align-items: center; gap: 10px; margin-bottom: 18px; }
  .mf-section-icon {
    width: 32px; height: 32px; border-radius: 9px;
    display: flex; align-items: center; justify-content: center;
    font-size: 15px; flex-shrink: 0;
  }
  .mf-section-icon-amber { background: #fef3c7; }
  .mf-section-icon-green { background: #d1fae5; }
  .mf-section-icon-blue  { background: #dbeafe; }
  .mf-section-title { font-family:'Syne',sans-serif; font-size:15px; font-weight:700; color:var(--text-primary); margin:0; }
  .mf-section-desc  { font-size:12px; color:var(--text-tertiary); margin:2px 0 0; }

  .mf-divider { height:1px; background:var(--border); margin:28px 0; }

  .mf-date-chip {
    display: inline-flex; align-items: center; gap: 8px;
    background: var(--amber-light); border: 1px solid #fcd34d;
    border-radius: 40px; padding: 8px 16px; margin-bottom: 18px;
  }
  .mf-date-chip-text { font-size:13px; font-weight:600; color:#92400e; }

  .mf-time-row { display:flex; align-items:center; gap:8px; }
  .mf-time-label {
    font-size:12px; font-weight:600; color:var(--text-secondary);
    letter-spacing:0.03em; display:flex; align-items:center; gap:6px; margin-bottom:8px;
  }
  .mf-time-select {
    height:42px; padding:0 12px;
    border:1.5px solid var(--border); border-radius:10px;
    background:var(--surface-muted); color:var(--text-primary);
    font-size:14px; font-family:'DM Sans',sans-serif;
    outline:none; cursor:pointer; transition:border-color .15s;
  }
  .mf-time-select:focus { border-color:var(--amber); box-shadow:0 0 0 3px rgba(245,158,11,.12); }
  .mf-time-sep { font-size:18px; font-weight:700; color:var(--text-tertiary); margin:0 2px; }

  .mf-label { font-size:12px; font-weight:600; color:var(--text-secondary); letter-spacing:0.03em; display:flex; align-items:center; gap:4px; margin-bottom:6px; }
  .mf-required { color:var(--rose); font-size:14px; line-height:1; }

  .mf-input {
    height:46px; padding:0 14px;
    border:1.5px solid var(--border); border-radius:var(--radius);
    background:var(--surface-muted); color:var(--text-primary);
    font-size:14px; font-family:'DM Sans',sans-serif;
    transition:border-color .15s,box-shadow .15s,background .15s;
    outline:none; width:100%;
  }
  .mf-input::placeholder { color:var(--text-tertiary); font-size:13px; }
  .mf-input:hover { border-color:#d4b896; }
  .mf-input:focus { border-color:var(--amber); background:var(--surface); box-shadow:0 0 0 3px rgba(245,158,11,.12); }
  .mf-textarea { padding:12px 14px; height:auto; resize:none; min-height:90px; }

  .mf-grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
  @media(max-width:500px){ .mf-grid-2{ grid-template-columns:1fr; } }

  .mf-calories-card {
    border:1.5px solid var(--border); border-radius:var(--radius);
    padding:14px 16px; background:var(--surface-muted);
    margin-bottom:14px; display:flex; align-items:center;
    justify-content:space-between; transition:border-color .15s;
  }
  .mf-calories-card:focus-within { border-color:var(--amber); background:var(--surface); box-shadow:0 0 0 3px rgba(245,158,11,.10); }
  .mf-calories-label { font-size:11px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:var(--text-tertiary); }
  .mf-calories-input {
    border:none; background:transparent; color:var(--text-primary);
    font-family:'Syne',sans-serif; font-size:32px; font-weight:800;
    outline:none; padding:0; width:160px;
    -moz-appearance:textfield;
  }
  .mf-calories-input::-webkit-outer-spin-button,
  .mf-calories-input::-webkit-inner-spin-button { -webkit-appearance:none; }
  .mf-calories-input::placeholder { color:var(--text-tertiary); font-size:28px; }
  .mf-calories-badge { background:#fef3c7; color:#92400e; font-size:12px; font-weight:700; padding:6px 14px; border-radius:40px; }

  .mf-macro-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
  @media(max-width:500px){ .mf-macro-grid{ grid-template-columns:1fr; } }

  .mf-macro-card {
    border:1.5px solid var(--border); border-radius:var(--radius);
    padding:12px 14px; background:var(--surface-muted); transition:border-color .15s;
  }
  .mf-macro-card:focus-within { border-color:var(--amber); background:var(--surface); box-shadow:0 0 0 3px rgba(245,158,11,.10); }
  .mf-macro-label { display:flex; align-items:center; gap:6px; font-size:11px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:var(--text-tertiary); margin-bottom:8px; }
  .mf-macro-dot { width:7px; height:7px; border-radius:50%; flex-shrink:0; }
  .mf-macro-input {
    border:none; background:transparent; color:var(--text-primary);
    font-family:'Syne',sans-serif; font-size:22px; font-weight:700;
    width:100%; outline:none; padding:0; -moz-appearance:textfield;
  }
  .mf-macro-input::-webkit-outer-spin-button,
  .mf-macro-input::-webkit-inner-spin-button { -webkit-appearance:none; }
  .mf-macro-input::placeholder { color:var(--text-tertiary); font-size:20px; }
  .mf-macro-unit { font-size:11px; color:var(--text-tertiary); font-weight:500; margin-top:2px; }

  .mf-footer {
    padding:20px 28px; border-top:1px solid var(--border);
    background:var(--surface-muted); display:flex;
    justify-content:flex-end; gap:10px; flex-wrap:wrap;
  }
  .mf-btn {
    height:44px; padding:0 22px; border-radius:10px;
    font-family:'DM Sans',sans-serif; font-size:14px; font-weight:600;
    cursor:pointer; transition:all .15s; border:none; outline:none;
    display:inline-flex; align-items:center; gap:7px;
  }
  .mf-btn-ghost { background:transparent; color:var(--text-secondary); border:1.5px solid var(--border); }
  .mf-btn-ghost:hover { background:var(--surface); color:var(--text-primary); border-color:#d4b896; }
  .mf-btn-primary { background:var(--amber); color:#1c1917; }
  .mf-btn-primary:hover:not(:disabled) { background:var(--amber-dark); transform:translateY(-1px); box-shadow:0 4px 14px rgba(245,158,11,.35); }
  .mf-btn-primary:disabled { opacity:.45; cursor:not-allowed; }

  .mf-success {
    display:flex; flex-direction:column; align-items:center; justify-content:center;
    gap:12px; padding:48px 28px; text-align:center;
  }
  .mf-success-icon { font-size:48px; animation: pop .4s cubic-bezier(.175,.885,.32,1.275); }
  @keyframes pop { from{transform:scale(0)} to{transform:scale(1)} }
  @keyframes mf-spin { to { transform: rotate(360deg); } }
  .mf-success-title { font-family:'Syne',sans-serif; font-size:20px; font-weight:800; color:var(--text-primary); margin:0; }
  .mf-success-sub { font-size:14px; color:var(--text-secondary); margin:0; }
`;

const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const mins  = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

const now = new Date();
const dateStr = now.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

export default function AddMealFormPreview() {
  const [formData, setFormData] = useState({
    name: '', amount: '', calories: '',
    protein: '', carbs: '', fats: '', fibre: '', other: '', notes: '',
  });
  const [hour, setHour] = useState(String(now.getHours()).padStart(2, '0'));
  const [min,  setMin]  = useState(String(now.getMinutes()).padStart(2, '0'));
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = (field) => (e) => setFormData(f => ({ ...f, [field]: e.target.value }));

  const handleSave = () => {
    if (!formData.name.trim()) return;
    setSaving(true);
    setTimeout(() => { setSaving(false); setSaved(true); }, 900);
  };

  const handleReset = () => { setSaved(false); setFormData({ name:'',amount:'',calories:'',protein:'',carbs:'',fats:'',fibre:'',other:'',notes:'' }); };

  return (
    <div className="meal-form-root">
      <style>{styles}</style>

      <p className="mf-eyebrow">New entry</p>
      <h1 className="mf-title">Add Meal</h1>
      <p className="mf-subtitle">Save a new item to your Food Library</p>
      <a
        href="/library"
        className="mf-date-chip"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 18, textDecoration: 'none', color: 'inherit' }}
        aria-label="Open Food Library"
      >
        <span>📚</span>
        <span className="mf-date-chip-text">Food Library</span>
      </a>

      <div className="mf-card">
        {saved ? (
          <div className="mf-success">
            <div className="mf-success-icon">✅</div>
            <p className="mf-success-title">Meal saved!</p>
            <p className="mf-success-sub">"{formData.name || 'Your meal'}" has been added to your Food Library.</p>
            <button className="mf-btn mf-btn-primary" onClick={handleReset} style={{marginTop:8}}>
              + Add another
            </button>
          </div>
        ) : (
          <>
            <div className="mf-card-body">

              {/* Date & Time */}
              <div className="mf-section">
                <div className="mf-section-header">
                  <div className="mf-section-icon mf-section-icon-amber">📅</div>
                  <div>
                    <p className="mf-section-title">Date &amp; Time</p>
                    <p className="mf-section-desc">When this meal was eaten</p>
                  </div>
                </div>
                <div className="mf-date-chip">
                  <span>📆</span>
                  <span className="mf-date-chip-text">{dateStr}</span>
                </div>
                <div className="mf-time-label">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                  Time
                </div>
                <div className="mf-time-row">
                  <select className="mf-time-select" value={hour} onChange={e => setHour(e.target.value)}>
                    {hours.map(h => <option key={h}>{h}</option>)}
                  </select>
                  <span className="mf-time-sep">:</span>
                  <select className="mf-time-select" value={min} onChange={e => setMin(e.target.value)}>
                    {mins.map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              <div className="mf-divider" />

              {/* Basic Info */}
              <div className="mf-section">
                <div className="mf-section-header">
                  <div className="mf-section-icon mf-section-icon-amber">🍽️</div>
                  <div>
                    <p className="mf-section-title">Basic Information</p>
                    <p className="mf-section-desc">Name and serving size</p>
                  </div>
                </div>
                <div style={{marginBottom:14}}>
                  <label className="mf-label">Meal Name <span className="mf-required">*</span></label>
                  <input className="mf-input" type="text" value={formData.name} onChange={set('name')} placeholder="e.g., Chicken salad, Greek yogurt…" autoFocus />
                </div>
                <div>
                  <label className="mf-label">Amount / Serving Size</label>
                  <input className="mf-input" type="text" value={formData.amount} onChange={set('amount')} placeholder="e.g., 1 cup, 200 g, 2 slices" />
                </div>
              </div>

              <div className="mf-divider" />

              {/* Nutrition */}
              <div className="mf-section">
                <div className="mf-section-header">
                  <div className="mf-section-icon mf-section-icon-green">⚡</div>
                  <div>
                    <p className="mf-section-title">Nutrition</p>
                    <p className="mf-section-desc">Macros &amp; calories — all optional</p>
                  </div>
                </div>

                <div className="mf-calories-card">
                  <div>
                    <div className="mf-calories-label">Calories</div>
                    <input className="mf-calories-input" type="number" value={formData.calories} onChange={set('calories')} placeholder="0" />
                  </div>
                  <span className="mf-calories-badge">kcal</span>
                </div>

                <div className="mf-macro-grid">
                  {[
                    { field:'protein', label:'Protein', color:'#3b82f6' },
                    { field:'carbs',   label:'Carbs',   color:'#f59e0b' },
                    { field:'fats',    label:'Fats',    color:'#f43f5e' },
                    { field:'fibre',   label:'Fibre',   color:'#10b981' },
                  ].map(({ field, label, color }) => (
                    <div className="mf-macro-card" key={field}>
                      <div className="mf-macro-label">
                        <span className="mf-macro-dot" style={{background:color}} />
                        {label}
                      </div>
                      <input className="mf-macro-input" type="number" value={formData[field]} onChange={set(field)} placeholder="—" />
                      <div className="mf-macro-unit">grams</div>
                    </div>
                  ))}
                </div>

                <div style={{marginTop:14}}>
                  <label className="mf-label">Other nutrients / tags</label>
                  <input className="mf-input" type="text" value={formData.other} onChange={set('other')} placeholder="e.g., Sodium 200 mg, Vitamin C…" />
                </div>
              </div>

              <div className="mf-divider" />

              {/* Notes */}
              <div className="mf-section">
                <div className="mf-section-header">
                  <div className="mf-section-icon mf-section-icon-blue">📝</div>
                  <div>
                    <p className="mf-section-title">Notes</p>
                    <p className="mf-section-desc">Anything else worth remembering</p>
                  </div>
                </div>
                <textarea className="mf-input mf-textarea" value={formData.notes} onChange={set('notes')} placeholder="How did it taste? Where was it from? Any prep tips…" rows={3} />
              </div>
            </div>

            <div className="mf-footer">
              <button className="mf-btn mf-btn-ghost" onClick={handleReset}>Cancel</button>
              <button
                className="mf-btn mf-btn-primary"
                onClick={handleSave}
                disabled={!formData.name.trim() || saving}
              >
                {saving ? (
                  <>
                    <span style={{display:'inline-block',width:14,height:14,border:'2px solid rgba(28,25,23,.3)',borderTopColor:'#1c1917',borderRadius:'50%',animation:'mf-spin .7s linear infinite'}} />
                    Saving…
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    Add Meal
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}