import { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { useAuthActions } from '@convex-dev/auth/react';
import { api } from '../../../convex/_generated/api';

function Field({ label, children, hint }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

const inputCls = "w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all";

export default function ProSettings() {
  const { signOut } = useAuthActions();
  const settings = useQuery(api.userSettings.get);
  const saveSettings = useMutation(api.userSettings.set);

  const [form, setForm] = useState({ calorieGoal: '', proteinGoal: '', weightGoal: '', weightUnit: 'kg' });
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setForm({
        calorieGoal: settings.calorieGoal?.toString() || '',
        proteinGoal: settings.proteinGoal?.toString() || '',
        weightGoal: settings.weightGoal?.toString() || '',
        weightUnit: settings.weightUnit || 'kg',
      });
    }
  }, [settings]);

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveSettings({
        calorieGoal: form.calorieGoal ? parseInt(form.calorieGoal) : undefined,
        proteinGoal: form.proteinGoal ? parseInt(form.proteinGoal) : undefined,
        weightGoal: form.weightGoal ? parseFloat(form.weightGoal) : undefined,
        weightUnit: form.weightUnit,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      alert(err.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-14 pb-20">
      <div className="max-w-2xl mx-auto px-4 py-5 space-y-5">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Settings</h2>
          <p className="text-sm text-gray-500">Your goals and preferences</p>
        </div>

        {/* Goals */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Daily goals</h3>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Calorie goal (kcal)" hint="e.g. 2000">
                <input className={inputCls} type="number" min="0" value={form.calorieGoal} onChange={set('calorieGoal')} placeholder="2000" />
              </Field>
              <Field label="Protein goal (g)" hint="e.g. 150">
                <input className={inputCls} type="number" min="0" value={form.proteinGoal} onChange={set('proteinGoal')} placeholder="150" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Target weight">
                <input className={inputCls} type="number" min="0" step="0.1" value={form.weightGoal} onChange={set('weightGoal')} placeholder="70.0" />
              </Field>
              <Field label="Weight unit">
                <select className={inputCls} value={form.weightUnit} onChange={set('weightUnit')}>
                  <option value="kg">kg</option>
                  <option value="lbs">lbs</option>
                </select>
              </Field>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-3 rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-60 transition-all flex items-center justify-center gap-2"
            >
              {saved ? (
                <>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Saved!
                </>
              ) : saving ? 'Saving…' : 'Save goals'}
            </button>
          </form>
        </div>

        {/* Account */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Account</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-gray-50">
              <div>
                <p className="text-sm font-medium text-gray-900">Storage</p>
                <p className="text-xs text-gray-400">Powered by Convex — syncs across all devices</p>
              </div>
              <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full">Active</span>
            </div>
            <button
              onClick={() => signOut()}
              className="w-full text-left text-sm text-red-600 hover:text-red-700 font-medium py-2 flex items-center gap-2 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
