import { useMemo, useRef, useEffect, useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

// ── Helpers ─────────────────────────────────────────────────────────────────

function dateToStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getLastNDays(n) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return dateToStr(d);
  });
}

function computeCurrentStreak(dateSet) {
  if (dateSet.size === 0) return 0;
  const d = new Date();
  // Allow streak to start from today or yesterday
  if (!dateSet.has(dateToStr(d))) d.setDate(d.getDate() - 1);
  let streak = 0;
  while (dateSet.has(dateToStr(d))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

function computeBestStreak(sortedDates) {
  if (sortedDates.length === 0) return 0;
  let best = 1, run = 1;
  for (let i = 1; i < sortedDates.length; i++) {
    const prev = new Date(sortedDates[i - 1] + 'T00:00:00');
    const curr = new Date(sortedDates[i] + 'T00:00:00');
    const diff = (curr - prev) / 86400000;
    run = diff === 1 ? run + 1 : 1;
    if (run > best) best = run;
  }
  return best;
}

function getMondayStr(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return dateToStr(d);
}

function pearsonCorr(xs, ys) {
  const n = xs.length;
  if (n < 3) return null;
  const mx = xs.reduce((s, x) => s + x, 0) / n;
  const my = ys.reduce((s, y) => s + y, 0) / n;
  const num = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0);
  const dx = Math.sqrt(xs.reduce((s, x) => s + (x - mx) ** 2, 0));
  const dy = Math.sqrt(ys.reduce((s, y) => s + (y - my) ** 2, 0));
  return dx === 0 || dy === 0 ? null : num / (dx * dy);
}

function isDarkMode() {
  return document.documentElement.classList.contains('dark');
}

// ── Component ────────────────────────────────────────────────────────────────

const CARD = 'bg-white dark:bg-transparent rounded-2xl dark:rounded-none shadow-lg dark:shadow-none border border-gray-100 dark:border-transparent p-3 sm:p-4';
const CARD_TITLE = 'text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 sm:mb-3 uppercase tracking-wide';

export default function ProInsights() {
  const allEntries = useQuery(api.entries.listAll);
  const [trendPeriod, setTrendPeriod] = useState('weekly');
  const trendRef = useRef(null);
  const corrRef = useRef(null);
  const trendChart = useRef(null);
  const corrChart = useRef(null);

  // ── Computed stats ────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    if (!allEntries) return null;

    const last7 = new Set(getLastNDays(7));
    const dailyCalMap = {};
    const dailySleepMap = {};
    let exerciseLast7 = 0;

    for (const e of allEntries) {
      if (e.type === 'meal' && e.calories) {
        dailyCalMap[e.date] = (dailyCalMap[e.date] || 0) + e.calories;
      }
      if (e.type === 'sleep' && e.sleepDuration) {
        dailySleepMap[e.date] = e.sleepDuration;
      }
      if (e.type === 'exercise' && last7.has(e.date)) {
        exerciseLast7++;
      }
    }

    const calDays7 = [...last7].filter(d => (dailyCalMap[d] || 0) > 0);
    const avgCal7 = calDays7.length > 0
      ? Math.round(calDays7.reduce((s, d) => s + dailyCalMap[d], 0) / calDays7.length)
      : null;

    const sleepDays7 = [...last7].filter(d => dailySleepMap[d]);
    const avgSleep7 = sleepDays7.length > 0
      ? sleepDays7.reduce((s, d) => s + dailySleepMap[d], 0) / sleepDays7.length
      : null;

    const measurements = allEntries.filter(e => e.type === 'measurements' && e.weight);
    const latestWeight = measurements.sort((a, b) => b.date.localeCompare(a.date))[0];

    const allDates = [...new Set(allEntries.map(e => e.date))].sort();
    const dateSet = new Set(allDates);
    const currentStreak = computeCurrentStreak(dateSet);
    const bestStreak = computeBestStreak(allDates);

    return {
      avgCal7, calDays7Len: calDays7.length,
      exerciseLast7,
      avgSleep7, sleepDays7Len: sleepDays7.length,
      latestWeight,
      currentStreak, bestStreak, totalDays: allDates.length,
      dailyCalMap, dailySleepMap,
    };
  }, [allEntries]);

  // ── Trend chart data ──────────────────────────────────────────────────────

  const trendData = useMemo(() => {
    if (!stats) return null;
    const { dailyCalMap, dailySleepMap } = stats;

    if (trendPeriod === 'weekly') {
      const days = getLastNDays(14).reverse();
      return {
        labels: days.map(d => {
          const dt = new Date(d + 'T00:00:00');
          return `${String(dt.getMonth() + 1).padStart(2, '0')}/${String(dt.getDate()).padStart(2, '0')}`;
        }),
        calories: days.map(d => dailyCalMap[d] ?? null),
        sleep: days.map(d => dailySleepMap[d] ?? null),
        hasData: days.some(d => dailyCalMap[d] || dailySleepMap[d]),
      };
    }

    // Monthly: last 12 weeks, each averaged
    const now = new Date();
    const weeks = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - i * 7);
      return getMondayStr(dateToStr(d));
    }).reverse();

    const weekCals = {};  // weekKey -> [dailyTotals]
    const weekSleep = {}; // weekKey -> [durations]

    for (const d of Object.keys(dailyCalMap)) {
      const wk = getMondayStr(d);
      if (!weekCals[wk]) weekCals[wk] = [];
      weekCals[wk].push(dailyCalMap[d]);
    }
    for (const d of Object.keys(dailySleepMap)) {
      const wk = getMondayStr(d);
      if (!weekSleep[wk]) weekSleep[wk] = [];
      weekSleep[wk].push(dailySleepMap[d]);
    }

    const labels = weeks.map(wk => {
      const d = new Date(wk + 'T00:00:00');
      return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
    });
    const calories = weeks.map(wk => {
      const vals = weekCals[wk];
      return vals?.length ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : null;
    });
    const sleep = weeks.map(wk => {
      const vals = weekSleep[wk];
      return vals?.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
    });

    return {
      labels, calories, sleep,
      hasData: calories.some(Boolean) || sleep.some(Boolean),
    };
  }, [stats, trendPeriod]);

  // ── Correlation chart data ────────────────────────────────────────────────

  const corrData = useMemo(() => {
    if (!stats) return null;
    const { dailyCalMap, dailySleepMap } = stats;
    const points = [];
    for (const d of Object.keys(dailySleepMap)) {
      if (dailyCalMap[d]) {
        points.push({ x: +dailySleepMap[d].toFixed(2), y: dailyCalMap[d] });
      }
    }
    if (points.length < 2) return { points, r: null };
    const r = pearsonCorr(points.map(p => p.x), points.map(p => p.y));
    return { points, r };
  }, [stats]);

  // ── Chart effects ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!trendRef.current || !trendData?.hasData) return;

    if (trendChart.current) { trendChart.current.destroy(); trendChart.current = null; }

    const dark = isDarkMode();
    const gridColor  = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
    const tickColor  = dark ? '#9ca3af' : '#6b7280';
    const labelColor = dark ? '#d1d5db' : '#374151';

    trendChart.current = new Chart(trendRef.current.getContext('2d'), {
      data: {
        labels: trendData.labels,
        datasets: [
          {
            type: 'bar',
            label: 'Calories',
            data: trendData.calories,
            backgroundColor: 'rgba(59,130,246,0.5)',
            borderColor: 'rgba(59,130,246,0.8)',
            borderWidth: 1,
            yAxisID: 'yCal',
            spanGaps: false,
          },
          {
            type: 'line',
            label: 'Sleep (h)',
            data: trendData.sleep,
            borderColor: 'rgba(168,85,247,0.9)',
            backgroundColor: 'rgba(168,85,247,0.15)',
            borderWidth: 2,
            pointRadius: 3,
            tension: 0.3,
            yAxisID: 'ySleep',
            spanGaps: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            labels: { color: labelColor, boxWidth: 12, font: { size: 11 } },
          },
        },
        scales: {
          x: {
            grid: { color: gridColor },
            ticks: { color: tickColor, font: { size: 10 }, maxRotation: 45 },
          },
          yCal: {
            type: 'linear',
            position: 'left',
            grid: { color: gridColor },
            ticks: { color: tickColor, font: { size: 10 } },
            title: { display: true, text: 'Calories', color: tickColor, font: { size: 10 } },
          },
          ySleep: {
            type: 'linear',
            position: 'right',
            grid: { drawOnChartArea: false },
            ticks: { color: tickColor, font: { size: 10 } },
            title: { display: true, text: 'Sleep (h)', color: tickColor, font: { size: 10 } },
            min: 0,
            max: 12,
          },
        },
      },
    });

    return () => { if (trendChart.current) { trendChart.current.destroy(); trendChart.current = null; } };
  }, [trendData]);

  useEffect(() => {
    if (!corrRef.current || !corrData || corrData.points.length < 2) return;

    if (corrChart.current) { corrChart.current.destroy(); corrChart.current = null; }

    const dark = isDarkMode();
    const gridColor  = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
    const tickColor  = dark ? '#9ca3af' : '#6b7280';

    corrChart.current = new Chart(corrRef.current.getContext('2d'), {
      type: 'scatter',
      data: {
        datasets: [{
          label: 'Sleep vs Calories',
          data: corrData.points,
          backgroundColor: 'rgba(168,85,247,0.55)',
          pointRadius: 5,
          pointHoverRadius: 7,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => `Sleep: ${ctx.parsed.x}h  Cal: ${ctx.parsed.y}`,
            },
          },
        },
        scales: {
          x: {
            grid: { color: gridColor },
            ticks: { color: tickColor, font: { size: 10 } },
            title: { display: true, text: 'Sleep (hours)', color: tickColor, font: { size: 10 } },
          },
          y: {
            grid: { color: gridColor },
            ticks: { color: tickColor, font: { size: 10 } },
            title: { display: true, text: 'Calories', color: tickColor, font: { size: 10 } },
          },
        },
      },
    });

    return () => { if (corrChart.current) { corrChart.current.destroy(); corrChart.current = null; } };
  }, [corrData]);

  // ── Loading ───────────────────────────────────────────────────────────────

  if (allEntries === undefined) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-7 h-7 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const corrSummary = corrData?.r != null
    ? `Correlation r = ${corrData.r.toFixed(2)} (${corrData.points.length} days with both sleep and meal data)`
    : corrData?.points.length
      ? `${corrData.points.length} day${corrData.points.length === 1 ? '' : 's'} with both logs — need at least 2 for correlation`
      : 'Need days with both sleep and meal logs.';

  return (
    <div className="w-full">
      <div className="max-w-sm mx-auto flex flex-col gap-4 sm:gap-5 px-3 sm:px-4 py-4 sm:py-6">

        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Insights</h1>

        {/* ── 4 category cards ────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">

          {/* Calories */}
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[var(--color-bg-muted)] p-3 sm:p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="w-2 h-5 rounded-full bg-blue-500 shrink-0" />
              <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Calories</span>
            </div>
            <p className="text-xl font-extrabold text-blue-600 dark:text-blue-400 leading-tight">
              {stats?.avgCal7 != null ? stats.avgCal7 : '—'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {stats?.avgCal7 != null ? `avg/day · ${stats.calDays7Len} day${stats.calDays7Len === 1 ? '' : 's'} this week` : 'No meals this week'}
            </p>
          </div>

          {/* Exercise */}
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[var(--color-bg-muted)] p-3 sm:p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="w-2 h-5 rounded-full bg-orange-500 shrink-0" />
              <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Exercise</span>
            </div>
            <p className="text-xl font-extrabold text-orange-600 dark:text-orange-400 leading-tight">
              {stats?.exerciseLast7 ?? '—'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">sessions this week</p>
          </div>

          {/* Sleep */}
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[var(--color-bg-muted)] p-3 sm:p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="w-2 h-5 rounded-full bg-purple-500 shrink-0" />
              <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sleep</span>
            </div>
            <p className="text-xl font-extrabold text-purple-600 dark:text-purple-400 leading-tight">
              {stats?.avgSleep7 != null ? `${stats.avgSleep7.toFixed(1)}h` : '—'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {stats?.avgSleep7 != null ? `avg/night · ${stats.sleepDays7Len} night${stats.sleepDays7Len === 1 ? '' : 's'} this week` : 'No sleep this week'}
            </p>
          </div>

          {/* Measurements */}
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[var(--color-bg-muted)] p-3 sm:p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="w-2 h-5 rounded-full bg-green-500 shrink-0" />
              <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Weight</span>
            </div>
            <p className="text-xl font-extrabold text-green-600 dark:text-green-400 leading-tight">
              {stats?.latestWeight
                ? `${stats.latestWeight.weight}${stats.latestWeight.weightUnit ?? 'kg'}`
                : '—'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {stats?.latestWeight ? `as of ${stats.latestWeight.date}` : 'No measurements yet'}
            </p>
          </div>

        </div>

        {/* ── Streaks ──────────────────────────────────────────────────── */}
        <div className={CARD}>
          <h2 className={CARD_TITLE}>Logging Streaks</h2>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {[
              { label: 'Current', value: stats?.currentStreak ?? '—', suffix: stats?.currentStreak === 1 ? ' day' : ' days' },
              { label: 'Best',    value: stats?.bestStreak    ?? '—', suffix: stats?.bestStreak    === 1 ? ' day' : ' days' },
              { label: 'Total',   value: stats?.totalDays     ?? '—', suffix: stats?.totalDays     === 1 ? ' day' : ' days' },
            ].map(({ label, value, suffix }) => (
              <div key={label} className="text-center p-2 bg-gray-50 dark:bg-gray-900/30 rounded-xl border border-gray-100 dark:border-gray-700">
                <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">{label}</p>
                <p className="text-2xl font-extrabold text-gray-900 dark:text-white leading-none">{value}</p>
                {typeof value === 'number' && <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{suffix}</p>}
              </div>
            ))}
          </div>
        </div>

        {/* ── Trend chart ──────────────────────────────────────────────── */}
        <div className={CARD}>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h2 className={CARD_TITLE} style={{ marginBottom: 0 }}>Calories & Sleep Trend</h2>
            <div className="inline-flex rounded-xl border border-gray-200 dark:border-gray-700 p-0.5 bg-gray-50 dark:bg-gray-900/30">
              {['weekly', 'monthly'].map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setTrendPeriod(p)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    trendPeriod === p
                      ? 'bg-blue-600 text-white dark:bg-blue-500'
                      : 'text-gray-600 dark:text-gray-300'
                  }`}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>
          {trendData?.hasData ? (
            <div className="relative h-52 sm:h-60 w-full">
              <canvas ref={trendRef} />
            </div>
          ) : (
            <p className="text-sm text-center text-gray-500 dark:text-gray-400 py-8">
              Not enough calorie or sleep data to draw a trend yet.
            </p>
          )}
        </div>

        {/* ── Correlation chart ────────────────────────────────────────── */}
        <div className={CARD}>
          <h2 className={CARD_TITLE}>Sleep vs Calories Correlation</h2>
          {corrData?.points.length >= 2 ? (
            <>
              <div className="relative h-52 sm:h-60 w-full">
                <canvas ref={corrRef} />
              </div>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{corrSummary}</p>
            </>
          ) : (
            <p className="text-sm text-center text-gray-500 dark:text-gray-400 py-8">
              Need days with both sleep and meal logs to show correlation.
            </p>
          )}
        </div>

      </div>
    </div>
  );
}
