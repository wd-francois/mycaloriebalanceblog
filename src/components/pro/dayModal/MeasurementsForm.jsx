import { useState } from 'react';
import { getCurrentTimeParts } from '../../../lib/dateUtils';
import { LABEL, INPUT } from './styles';
import FormButtons from './FormButtons';

// ── Measurement field (must be outside MeasurementsForm to avoid remount-on-type) ──
export function MeasurementField({ label, value, onChange, suffix }) {
  return (
    <div>
      {label && <label className={LABEL}>{label}</label>}
      <div className="flex gap-2">
        <input
          type="number" step="0.1" min="0"
          className={INPUT + ' flex-1'}
          value={value}
          onChange={onChange}
          placeholder="0.0"
        />
        <div className="flex items-center justify-center px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[var(--color-bg-subtle)] text-gray-500 dark:text-gray-400 text-sm font-semibold flex-shrink-0">
          {suffix}
        </div>
      </div>
    </div>
  );
}

// ── Measurements Form ──────────────────────────────────────────────────────────
export default function MeasurementsForm({ dateStr, weightUnit: initialWeightUnit = 'kg', onSave, onCancel }) {
  const [time]      = useState(() => getCurrentTimeParts());
  const [unit, setUnit] = useState(initialWeightUnit);
  const [form, setForm] = useState({
    weight: '', neck: '', shoulders: '', chest: '', waist: '', hips: '',
    thigh: '', arm: '', calf: '',
    chestSkinfold: '', abdominalSkinfold: '', thighSkinfold: '',
    tricepSkinfold: '', subscapularSkinfold: '', suprailiacSkinfold: '',
    notes: '',
  });

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));
  const num = (val) => val ? Number(val) : undefined;

  const submit = (e) => {
    e.preventDefault();
    if (!form.weight) return;
    onSave({
      type: 'measurements', date: dateStr, time,
      weight: num(form.weight), weightUnit: unit,
      neck:      num(form.neck),
      shoulders: num(form.shoulders),
      chest:     num(form.chest),
      waist:     num(form.waist),
      hips:      num(form.hips),
      thigh:     num(form.thigh),
      arm:       num(form.arm),
      calf:      num(form.calf),
      chestSkinfold:       num(form.chestSkinfold),
      abdominalSkinfold:   num(form.abdominalSkinfold),
      thighSkinfold:       num(form.thighSkinfold),
      tricepSkinfold:      num(form.tricepSkinfold),
      subscapularSkinfold: num(form.subscapularSkinfold),
      suprailiacSkinfold:  num(form.suprailiacSkinfold),
      notes: form.notes.trim() || undefined,
    });
  };

  const lengthUnit = unit === 'kg' ? 'cm' : 'in';
  const F = (fkey, suffix) => ({ value: form[fkey], onChange: set(fkey), suffix });

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div>
        <label className={LABEL}>Weight *</label>
        <MeasurementField label="" value={form.weight} onChange={set('weight')} suffix={unit} />
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Girth Measurements</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <MeasurementField label="Neck"      {...F('neck',      lengthUnit)} />
          <MeasurementField label="Shoulders" {...F('shoulders', lengthUnit)} />
          <MeasurementField label="Chest"     {...F('chest',     lengthUnit)} />
          <MeasurementField label="Waist"     {...F('waist',     lengthUnit)} />
          <MeasurementField label="Hips"      {...F('hips',      lengthUnit)} />
          <MeasurementField label="Thigh"     {...F('thigh',     lengthUnit)} />
          <MeasurementField label="Arm"       {...F('arm',       lengthUnit)} />
          <MeasurementField label="Calf"      {...F('calf',      lengthUnit)} />
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Skinfold Measurements</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <MeasurementField label="Chest"       {...F('chestSkinfold',       'mm')} />
          <MeasurementField label="Abdominal"   {...F('abdominalSkinfold',   'mm')} />
          <MeasurementField label="Thigh"       {...F('thighSkinfold',       'mm')} />
          <MeasurementField label="Tricep"      {...F('tricepSkinfold',      'mm')} />
          <MeasurementField label="Subscapular" {...F('subscapularSkinfold', 'mm')} />
          <MeasurementField label="Suprailiac"  {...F('suprailiacSkinfold',  'mm')} />
        </div>
      </div>

      <div>
        <label className={LABEL}>Notes</label>
        <textarea rows={2} className={INPUT + ' resize-none'} value={form.notes} onChange={set('notes')} placeholder="Optional…" />
      </div>

      <FormButtons onCancel={onCancel} submitLabel="Add Measurements" />
    </form>
  );
}
