import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';

function daysAgoISO(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function StatCard({ label, value, sub, color = 'text-gray-900' }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <p className="text-xs text-gray-500 font-medium mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function BarChart({ data, color = '#3b82f6', label }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div>
      <p className="text-xs text-gray-500 font-medium mb-2">{label}</p>
      <div className="flex items-end gap-1 h-24">
        {data.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full rounded-t-md transition-all" style={{ height: `${(d.value / max) * 100}%`, backgroundColor: color, minHeight: d.value > 0 ? '4px' : '0' }} />
            <span className="text-[9px] text-gray-400">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ProInsights({ settings }) {
  const entries = useQuery(api.entries.listByDateRange, {
    startDate: daysAgoISO(29),
    endDate: todayISO(),
  }) ?? [];

  const meals = entries.filter((e) => e.type === 'meal');
  const exercises = entries.filter((e) => e.type === 'exercise');
  const activities = entries.filter((e) => e.type === 'activity');
  const weights = entries.filter((e) => e.type === 'measurements' && e.weight);
  const sleeps = entries.filter((e) => e.type === 'sleep' && e.sleepDuration);

  // 7-day daily calories
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const date = daysAgoISO(6 - i);
    const dayMeals = meals.filter((e) => e.date === date);
    const cals = dayMeals.reduce((s, e) => s + (e.calories || 0), 0);
    const label = new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'narrow' });
    return { date, value: cals, label };
  });

  const avgCals = meals.length
    ? Math.round(meals.reduce((s, e) => s + (e.calories || 0), 0) / Math.max(last7.filter((d) => d.value > 0).length, 1))
    : 0;

  const avgProtein = meals.length
    ? Math.round(meals.reduce((s, e) => s + (e.protein || 0), 0) / Math.max(last7.filter((d) => d.value > 0).length, 1))
    : 0;

  const latestWeight = weights.sort((a, b) => b.date.localeCompare(a.date))[0];
  const avgSleep = sleeps.length
    ? (sleeps.reduce((s, e) => s + (e.sleepDuration || 0), 0) / sleeps.length).toFixed(1)
    : null;

  const totalWorkouts = exercises.length + activities.length;

  return (
    <div className="min-h-screen bg-gray-50 pt-14 pb-20">
      <div className="max-w-2xl mx-auto px-4 py-5 space-y-5">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Insights</h2>
          <p className="text-sm text-gray-500">Last 30 days</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="Avg daily calories"
            value={avgCals ? `${avgCals.toLocaleString()} kcal` : '—'}
            sub={settings?.calorieGoal ? `Goal: ${settings.calorieGoal.toLocaleString()} kcal` : undefined}
            color={avgCals && settings?.calorieGoal && avgCals > settings.calorieGoal ? 'text-red-600' : 'text-gray-900'}
          />
          <StatCard
            label="Avg daily protein"
            value={avgProtein ? `${avgProtein}g` : '—'}
            sub={settings?.proteinGoal ? `Goal: ${settings.proteinGoal}g` : undefined}
          />
          <StatCard
            label="Workouts logged"
            value={totalWorkouts || '—'}
            sub="exercises + activities"
          />
          <StatCard
            label="Avg sleep"
            value={avgSleep ? `${avgSleep}h` : '—'}
            sub={sleeps.length ? `${sleeps.length} nights logged` : undefined}
          />
        </div>

        {/* Current weight */}
        {latestWeight && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-500 font-medium mb-1">Latest weight</p>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-gray-900">{latestWeight.weight}</span>
              <span className="text-gray-400 mb-1">{latestWeight.weightUnit || 'kg'}</span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">Logged {latestWeight.date}</p>
          </div>
        )}

        {/* 7-day calorie chart */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <BarChart data={last7} color="#3b82f6" label="Calories this week" />
        </div>

        {/* Meal breakdown */}
        {meals.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
            <p className="text-sm font-semibold text-gray-900">Nutrition summary</p>
            {[
              { label: 'Total calories', value: `${meals.reduce((s, e) => s + (e.calories || 0), 0).toLocaleString()} kcal`, color: 'bg-orange-400' },
              { label: 'Total protein', value: `${Math.round(meals.reduce((s, e) => s + (e.protein || 0), 0))}g`, color: 'bg-blue-500' },
              { label: 'Total carbs', value: `${Math.round(meals.reduce((s, e) => s + (e.carbs || 0), 0))}g`, color: 'bg-amber-400' },
              { label: 'Total fat', value: `${Math.round(meals.reduce((s, e) => s + (e.fat || 0), 0))}g`, color: 'bg-pink-400' },
            ].map((row) => (
              <div key={row.label} className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${row.color}`} />
                <span className="text-sm text-gray-600 flex-1">{row.label}</span>
                <span className="text-sm font-semibold text-gray-900">{row.value}</span>
              </div>
            ))}
          </div>
        )}

        {entries.length === 0 && (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center">
            <p className="text-2xl mb-2">📊</p>
            <p className="text-sm text-gray-500">Start logging entries to see insights here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
