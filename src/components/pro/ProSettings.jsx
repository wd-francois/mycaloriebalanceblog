import { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useConvexSettings } from '../../contexts/ConvexSettingsContext';
import { useAuthActions } from '@convex-dev/auth/react';

const INPUT  = 'w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[var(--color-bg-subtle)] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition';
const LABEL  = 'block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1';
const CARD   = 'bg-white dark:bg-[var(--color-bg-muted)] rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-800';
const ROWLBL = 'text-sm font-medium text-gray-700 dark:text-gray-300';
const ROWSUB = 'text-xs text-gray-500 dark:text-gray-400 mt-0.5';

// Horizontal 2-option pill toggle (kg/lbs, 12h/24h, etc.)
function Toggle2({ options, value, onChange }) {
  return (
    <div className="flex rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden h-[38px] min-w-[120px]">
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`flex-1 text-sm font-semibold px-3 transition-colors ${
            value === opt.value
              ? 'bg-blue-600 text-white'
              : 'bg-white dark:bg-[var(--color-bg-subtle)] text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// Select dropdown (for multi-option settings)
function Select({ id, value, options, onChange }) {
  return (
    <select
      id={id}
      value={value}
      onChange={e => onChange(e.target.value)}
      className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[var(--color-bg-subtle)] text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition min-w-[180px]"
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

// Row layout: label+description on left, control on right
function SettingRow({ label, description, children }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 border-b border-gray-100 dark:border-gray-800 last:border-b-0 last:pb-0">
      <div className="flex-1">
        <p className={ROWLBL}>{label}</p>
        {description && <p className={ROWSUB}>{description}</p>}
      </div>
      <div className="flex justify-start sm:justify-end">
        {children}
      </div>
    </div>
  );
}

// Toggle switch (boolean)
function ToggleSwitch({ checked, onChange }) {
  return (
    <label className="relative inline-flex items-center cursor-pointer select-none">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="sr-only peer" />
      <div className="w-10 h-[22px] bg-gray-200 dark:bg-gray-700 rounded-full peer peer-checked:bg-blue-600
        after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:rounded-full
        after:w-4 after:h-4 after:transition-all peer-checked:after:translate-x-[18px]" />
    </label>
  );
}

export default function ProSettings({ user, role: cachedRole }) {
  // ── Convex goals ─────────────────────────────────────────────────────────
  const convexSettings   = useQuery(api.userSettings.get);
  const queriedRole      = useQuery(api.coaches.getRole);
  // Fall back to the already-resolved role (cached in ProApp) while this
  // query is loading, e.g. right after a back/forward navigation — avoids
  // flashing "Client" for a coach before the fresh query resolves.
  const currentRole      = queriedRole ?? cachedRole;
  const saveGoals      = useMutation(api.userSettings.set);
  const updateName     = useMutation(api.users.updateName);
  const { signOut }    = useAuthActions();

  // ── App preferences (localStorage via ConvexSettingsContext) ─────────────
  const { settings, updateSetting } = useConvexSettings();

  const [calGoal,    setCalGoal]    = useState('');
  const [protGoal,   setProtGoal]   = useState('');
  const [weightGoal, setWeightGoal] = useState('');
  const [name,       setName]       = useState('');
  const [saved,      setSaved]      = useState(false);
  const [isDark,     setIsDark]     = useState(false);

  // Populate goals from Convex on load
  useEffect(() => {
    if (!convexSettings) return;
    setCalGoal(convexSettings.calorieGoal  != null ? String(convexSettings.calorieGoal)  : '');
    setProtGoal(convexSettings.proteinGoal != null ? String(convexSettings.proteinGoal)  : '');
    setWeightGoal(convexSettings.weightGoal != null ? String(convexSettings.weightGoal) : '');
  }, [convexSettings]);

  // Populate display name
  useEffect(() => { if (user?.name) setName(user.name); }, [user?.name]);

  // Sync dark-mode state with document class
  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains('dark'));
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  const handleThemeToggle = () => {
    const nowDark = document.documentElement.classList.contains('dark');
    document.documentElement.classList.toggle('dark', !nowDark);
    localStorage.setItem('theme', nowDark ? 'light' : 'dark');
    setIsDark(!nowDark);
  };

  const handleSaveGoals = async (e) => {
    e.preventDefault();
    await Promise.all([
      saveGoals({
        calorieGoal:  calGoal    ? Number(calGoal)    : undefined,
        proteinGoal:  protGoal   ? Number(protGoal)   : undefined,
        weightGoal:   weightGoal ? Number(weightGoal) : undefined,
        weightUnit:   settings.weightUnit,
      }),
      name.trim() !== (user?.name ?? '') ? updateName({ name: name.trim() }) : Promise.resolve(),
    ]);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  // Derived preview for AI prompt
  const promptPreview = (settings.aiPromptTemplate ?? '')
    .replace(/{mealName}/g, 'Chicken Breast')
    .replace(/{amount}/g,   '200g')
    .replace(/{calories}/g, 'not specified')
    .replace(/{protein}/g,  'not specified')
    .replace(/{carbs}/g,    'not specified')
    .replace(/{fats}/g,     'not specified')
    .replace(/{fibre}/g,    'not specified')
    .replace(/{other}/g,    'not specified');

  return (
    <div className="w-full">
      <div className="max-w-sm mx-auto px-3 sm:px-4 py-4 sm:py-6 flex flex-col gap-5">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Settings</h1>

        {/* ── Profile & Goals (Convex) ────────────────────────────────── */}
        <div className={CARD}>
          <h2 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-4">Profile &amp; Goals</h2>
          <form onSubmit={handleSaveGoals} className="flex flex-col gap-4">
            <div>
              <label className={LABEL}>Display name</label>
              <input
                type="text"
                className={INPUT}
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Mike, Frank…"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL}>Calorie goal</label>
                <input
                  type="number" min="0" step="50"
                  className={INPUT}
                  value={calGoal}
                  onChange={e => setCalGoal(e.target.value)}
                  placeholder="e.g. 2000"
                />
                <p className="text-[10px] text-gray-400 mt-1">kcal / day</p>
              </div>
              <div>
                <label className={LABEL}>Protein goal</label>
                <input
                  type="number" min="0" step="5"
                  className={INPUT}
                  value={protGoal}
                  onChange={e => setProtGoal(e.target.value)}
                  placeholder="e.g. 150"
                />
                <p className="text-[10px] text-gray-400 mt-1">g / day</p>
              </div>
            </div>
            <div>
              <label className={LABEL}>Weight goal</label>
              <input
                type="number" min="0" step="0.5"
                className={INPUT}
                value={weightGoal}
                onChange={e => setWeightGoal(e.target.value)}
                placeholder={`e.g. ${settings.weightUnit === 'lbs' ? '165' : '75'}`}
              />
              <p className="text-[10px] text-gray-400 mt-1">{settings.weightUnit}</p>
            </div>
            <button
              type="submit"
              className={`w-full py-3 rounded-xl text-sm font-semibold transition-all ${
                saved
                  ? 'bg-green-500 text-white'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-sm'
              }`}
            >
              {saved ? '✓ Saved' : 'Save Goals'}
            </button>
          </form>
        </div>

        {/* ── App Preferences (localStorage) ─────────────────────────── */}
        <div className={CARD}>
          <h2 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-1">App Preferences</h2>
          <div>

            <SettingRow label="Dark Mode" description="Switch between light and dark theme">
              <button
                type="button"
                onClick={handleThemeToggle}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[var(--color-bg-subtle)] hover:bg-gray-50 dark:hover:bg-[var(--color-bg-muted)] text-gray-700 dark:text-gray-300 text-sm font-medium transition"
              >
                {isDark ? (
                  <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="5" />
                    <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                    <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  </svg>
                )}
                {isDark ? 'Light Mode' : 'Dark Mode'}
              </button>
            </SettingRow>

            <SettingRow label="Weight Unit" description="Unit for body weight">
              <Toggle2
                options={[{ value: 'kg', label: 'kg' }, { value: 'lbs', label: 'lbs' }]}
                value={settings.weightUnit ?? 'kg'}
                onChange={v => updateSetting('weightUnit', v)}
              />
            </SettingRow>

            <SettingRow label="Length Unit" description="Unit for body measurements">
              <Toggle2
                options={[{ value: 'cm', label: 'cm' }, { value: 'in', label: 'in' }]}
                value={settings.lengthUnit ?? 'cm'}
                onChange={v => updateSetting('lengthUnit', v)}
              />
            </SettingRow>

            <SettingRow label="Date Format" description="How dates are displayed">
              <Select
                id="dateFormat"
                value={settings.dateFormat ?? 'MM/DD/YYYY'}
                onChange={v => updateSetting('dateFormat', v)}
                options={[
                  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
                  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
                ]}
              />
            </SettingRow>

            <SettingRow label="Time Format" description="How times are displayed">
              <Toggle2
                options={[{ value: '12h', label: '12h' }, { value: '24h', label: '24h' }]}
                value={settings.timeFormat ?? '12h'}
                onChange={v => updateSetting('timeFormat', v)}
              />
            </SettingRow>

          </div>
        </div>

        {/* ── AI Assistant (localStorage) ─────────────────────────────── */}
        <div className={CARD}>
          <h2 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-1">AI Assistant</h2>
          <div>

            <SettingRow label="AI Service" description="Which AI to open for nutrition queries">
              <Select
                id="aiService"
                value={settings.aiService ?? 'chatgpt'}
                onChange={v => updateSetting('aiService', v)}
                options={[
                  { value: 'chatgpt', label: 'ChatGPT' },
                  { value: 'claude',  label: 'Claude AI' },
                  { value: 'gemini',  label: 'Google Gemini' },
                  { value: 'grok',    label: 'Grok (X)' },
                  { value: 'custom',  label: 'Custom URL' },
                ]}
              />
            </SettingRow>

            {settings.aiService === 'custom' && (
              <div className="py-3 border-b border-gray-100 dark:border-gray-800">
                <label className={LABEL}>Custom AI service URL</label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">The prompt will be appended as a query parameter.</p>
                <input
                  type="url"
                  className={INPUT}
                  value={settings.aiCustomUrl ?? ''}
                  onChange={e => updateSetting('aiCustomUrl', e.target.value)}
                  placeholder="https://your-ai-service.com/?q="
                />
              </div>
            )}

            <SettingRow label="Request Format" description="How detailed the AI prompt should be">
              <Select
                id="aiRequestFormat"
                value={settings.aiRequestFormat ?? 'detailed'}
                onChange={v => updateSetting('aiRequestFormat', v)}
                options={[
                  { value: 'detailed', label: 'Detailed' },
                  { value: 'simple',   label: 'Simple' },
                  { value: 'custom',   label: 'Custom template' },
                ]}
              />
            </SettingRow>

            <SettingRow label="Language" description="Language for AI responses">
              <Select
                id="aiLanguage"
                value={settings.aiLanguage ?? 'english'}
                onChange={v => updateSetting('aiLanguage', v)}
                options={[
                  { value: 'english',    label: 'English' },
                  { value: 'spanish',    label: 'Spanish' },
                  { value: 'french',     label: 'French' },
                  { value: 'german',     label: 'German' },
                  { value: 'portuguese', label: 'Portuguese' },
                ]}
              />
            </SettingRow>

            <SettingRow label="Include current values" description="Add existing nutritional values in AI prompt">
              <ToggleSwitch
                checked={settings.aiIncludeCurrentValues ?? true}
                onChange={v => updateSetting('aiIncludeCurrentValues', v)}
              />
            </SettingRow>

            {settings.aiRequestFormat === 'custom' && (
              <div className="pt-3">
                <div className="mb-3">
                  <label className={LABEL}>Custom prompt template</label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    Placeholders: <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded text-[10px]">{'{mealName}'}</code>{' '}
                    <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded text-[10px]">{'{amount}'}</code>{' '}
                    <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded text-[10px]">{'{calories}'}</code>{' '}
                    <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded text-[10px]">{'{protein}'}</code>{' '}
                    <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded text-[10px]">{'{carbs}'}</code>{' '}
                    <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded text-[10px]">{'{fats}'}</code>{' '}
                    <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded text-[10px]">{'{fibre}'}</code>
                  </p>
                  <textarea
                    value={settings.aiPromptTemplate ?? ''}
                    onChange={e => updateSetting('aiPromptTemplate', e.target.value)}
                    rows={7}
                    className={`${INPUT} font-mono text-xs resize-y`}
                    placeholder="Enter your custom prompt template…"
                  />
                </div>
                <div className="bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 rounded-xl p-3">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Preview (with sample data)</p>
                  <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono break-words">
                    {promptPreview}
                  </pre>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* ── Account ────────────────────────────────────────────────── */}
        <div className={CARD}>
          <h2 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-1">Account</h2>
          <div>

            <SettingRow
              label="Account role"
              description={currentRole === 'coach'
                ? 'Coach mode — you can view and comment on client data'
                : 'Client mode — your data can be viewed by a linked coach'}
            >
              <Toggle2
                options={[{ value: 'client', label: 'Client' }, { value: 'coach', label: 'Coach' }]}
                value={currentRole ?? 'client'}
                onChange={v => saveGoals({ role: v })}
              />
            </SettingRow>

            <SettingRow label="Sign out" description="Sign out of your Pro account">
              <button
                type="button"
                onClick={() => signOut()}
                className="px-4 py-2 rounded-xl border border-red-200 dark:border-red-900 text-red-500 dark:text-red-400 text-sm font-semibold hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                Sign out
              </button>
            </SettingRow>

          </div>
        </div>

        {/* Help & Guide */}
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('pro:navigate', { detail: 'help' }))}
          className="flex items-center gap-3 w-full bg-white dark:bg-[var(--color-bg-muted)] rounded-2xl px-4 py-3.5 border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Help &amp; Guide</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Features, tips, and FAQ</p>
          </div>
          <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Footer */}
        <p className="text-center text-xs text-gray-300 dark:text-gray-700">
          My Calorie Balance Pro · Preferences saved automatically
        </p>

      </div>
    </div>
  );
}
