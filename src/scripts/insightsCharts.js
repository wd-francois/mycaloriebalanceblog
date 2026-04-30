/**
 * Chart.js visualizations for Insights category pages (client-side only).
 */
import Chart from 'chart.js/auto';

let mainChart = null;
let secondaryChart = null;
let hubTrendChart = null;
let hubCorrelationChart = null;

/** Avoid duplicate listeners when re-rendering the primary chart. */
let caloriePeriodBound = false;
let hubTrendPeriodBound = false;

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function destroyInsightCharts() {
  try {
    mainChart?.destroy();
    secondaryChart?.destroy();
    hubTrendChart?.destroy();
    hubCorrelationChart?.destroy();
  } catch {
    /* ignore */
  }
  mainChart = null;
  secondaryChart = null;
  hubTrendChart = null;
  hubCorrelationChart = null;
}

export function renderInsightStats(stats) {
  const el = document.getElementById('insight-stats-grid');
  if (!el || !stats?.length) return;
  el.innerHTML = stats
    .map(
      (s) => `
    <div class="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[var(--color-bg-muted)] p-3 sm:p-4 shadow-sm">
      <p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">${escapeHtml(s.label)}</p>
      <p class="mt-1 text-lg sm:text-xl font-bold text-gray-900 dark:text-white tabular-nums">${escapeHtml(s.value)}</p>
    </div>
  `
    )
    .join('');
}

function isDarkMode() {
  return document.documentElement.classList.contains('dark');
}

function axisColors() {
  const dark = isDarkMode();
  return {
    tick: dark ? '#9ca3af' : '#6b7280',
    grid: dark ? 'rgba(75, 85, 99, 0.28)' : 'rgba(0, 0, 0, 0.06)'
  };
}

const ACCENT = {
  calories: { stroke: 'rgb(59, 130, 246)', fill: 'rgba(59, 130, 246, 0.12)' },
  exercise: { stroke: 'rgb(234, 88, 12)', fill: 'rgba(234, 88, 12, 0.15)' },
  sleep: { stroke: 'rgb(147, 51, 234)', fill: 'rgba(147, 51, 234, 0.12)' },
  measurements: { stroke: 'rgb(22, 163, 74)', fill: 'rgba(22, 163, 74, 0.12)' }
};

/**
 * @param {{ getHubTrendSeries: (period: 'weekly' | 'monthly') => ({ labels: string[], calories: number[], sleep: number[] } | null) }} dashboard
 * @param {'weekly' | 'monthly'} period
 */
export function renderHubTrendChart(dashboard, period = 'weekly') {
  const wrap = document.getElementById('insight-hub-trend-wrap');
  const canvas = document.getElementById('insight-hub-trend-chart');
  const empty = document.getElementById('insight-hub-trend-empty');
  const periodWrap = document.getElementById('insight-hub-trend-period-wrap');
  if (!wrap || !canvas || !empty) return;

  if (periodWrap && !hubTrendPeriodBound) {
    hubTrendPeriodBound = true;
    periodWrap.addEventListener('click', (e) => {
      const btn = e.target?.closest?.('[data-hub-trend-period]');
      if (!btn || !(btn instanceof HTMLButtonElement)) return;
      const next = btn.getAttribute('data-hub-trend-period');
      if (next !== 'weekly' && next !== 'monthly') return;

      periodWrap.querySelectorAll('[data-hub-trend-period]').forEach((b) => {
        const on = b === btn;
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
        b.classList.toggle('bg-blue-600', on);
        b.classList.toggle('text-white', on);
        b.classList.toggle('dark:bg-blue-500', on);
      });
      renderHubTrendChart(dashboard, next);
    });
  }

  const data = dashboard.getHubTrendSeries(period);
  hubTrendChart?.destroy();
  hubTrendChart = null;

  const { tick, grid } = axisColors();
  if (!data) {
    wrap.classList.add('hidden');
    empty.classList.remove('hidden');
    return;
  }
  wrap.classList.remove('hidden');
  empty.classList.add('hidden');

  hubTrendChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels: data.labels,
      datasets: [
        {
          label: period === 'weekly' ? 'Calories (avg/day by week)' : 'Calories (avg/day by month)',
          data: data.calories,
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.12)',
          borderWidth: 2,
          tension: 0.25,
          yAxisID: 'yCalories'
        },
        {
          label: period === 'weekly' ? 'Sleep (avg/night by week)' : 'Sleep (avg/night by month)',
          data: data.sleep,
          borderColor: 'rgb(147, 51, 234)',
          backgroundColor: 'rgba(147, 51, 234, 0.12)',
          borderWidth: 2,
          tension: 0.25,
          yAxisID: 'ySleep'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: {
          ticks: { color: tick, autoSkip: true, maxTicksLimit: 12 },
          grid: { color: grid }
        },
        yCalories: {
          type: 'linear',
          position: 'left',
          ticks: { color: tick },
          grid: { color: grid },
          title: { display: true, text: 'kcal/day', color: tick, font: { size: 11 } }
        },
        ySleep: {
          type: 'linear',
          position: 'right',
          ticks: { color: tick },
          grid: { drawOnChartArea: false },
          title: { display: true, text: 'hours/night', color: tick, font: { size: 11 } }
        }
      }
    }
  });
}

/**
 * @param {{ points: { x: number, y: number }[], r: number | null, n: number } | null} corr
 */
export function renderHubCorrelationChart(corr) {
  const wrap = document.getElementById('insight-hub-correlation-wrap');
  const canvas = document.getElementById('insight-hub-correlation-chart');
  const empty = document.getElementById('insight-hub-correlation-empty');
  const summary = document.getElementById('insight-hub-correlation-summary');
  if (!wrap || !canvas || !empty || !summary) return;

  hubCorrelationChart?.destroy();
  hubCorrelationChart = null;
  const { tick, grid } = axisColors();

  if (!corr) {
    wrap.classList.add('hidden');
    empty.classList.remove('hidden');
    summary.textContent = 'Correlation needs at least two days with both sleep and meal logs.';
    return;
  }

  wrap.classList.remove('hidden');
  empty.classList.add('hidden');
  const rText = corr.r == null ? 'n/a' : corr.r.toFixed(2);
  let label = 'No clear relationship';
  if (corr.r != null) {
    if (corr.r >= 0.4) label = 'Moderate positive relationship';
    else if (corr.r >= 0.2) label = 'Slight positive relationship';
    else if (corr.r <= -0.4) label = 'Moderate negative relationship';
    else if (corr.r <= -0.2) label = 'Slight negative relationship';
  }
  summary.textContent = `${label} (r=${rText}) across ${corr.n} logged day${corr.n === 1 ? '' : 's'}.`;

  hubCorrelationChart = new Chart(canvas, {
    type: 'scatter',
    data: {
      datasets: [
        {
          label: 'Daily points',
          data: corr.points,
          pointRadius: 4,
          pointHoverRadius: 5,
          borderWidth: 0,
          backgroundColor: 'rgba(59, 130, 246, 0.75)'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          title: { display: true, text: 'Sleep (hours)', color: tick, font: { size: 11 } },
          ticks: { color: tick },
          grid: { color: grid }
        },
        y: {
          title: { display: true, text: 'Calories (kcal)', color: tick, font: { size: 11 } },
          ticks: { color: tick },
          grid: { color: grid }
        }
      }
    }
  });
}

/**
 * @param {string} category
 * @param {{ getPrimaryChartSeries: (c: string, p?: string) => object | null, getSecondaryChartSeries: (c: string) => object | null }} dashboard
 * @param {'daily' | 'weekly' | 'monthly'} [caloriePeriod]
 */
export function renderInsightCharts(category, dashboard, caloriePeriod = 'daily') {
  destroyInsightCharts();

  const periodWrap = document.getElementById('insight-calorie-period-wrap');
  if (category === 'calories' && periodWrap && !caloriePeriodBound) {
    caloriePeriodBound = true;
    periodWrap.addEventListener('click', (e) => {
      const btn = e.target?.closest?.('[data-calorie-period]');
      if (!btn || !(btn instanceof HTMLButtonElement)) return;
      const period = btn.getAttribute('data-calorie-period');
      if (!period || !['daily', 'weekly', 'monthly'].includes(period)) return;
      periodWrap.querySelectorAll('[data-calorie-period]').forEach((b) => {
        const on = b === btn;
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
        b.classList.toggle('bg-blue-600', on);
        b.classList.toggle('text-white', on);
        b.classList.toggle('dark:bg-blue-500', on);
        b.classList.toggle('shadow-sm', on);
        b.classList.toggle('bg-transparent', !on);
        b.classList.toggle('text-gray-700', !on);
        b.classList.toggle('dark:text-gray-200', !on);
      });
      renderInsightCharts(category, dashboard, /** @type {'daily' | 'weekly' | 'monthly'} */ (period));
    });
  }

  const wrap = document.getElementById('insight-chart-main-wrap');
  const emptyEl = document.getElementById('insight-chart-empty');
  const primaryCanvas = document.getElementById('insight-chart-main');
  const secondaryBlock = document.getElementById('insight-chart-secondary-block');
  const secondaryTitle = document.getElementById('insight-chart-secondary-title');
  const secondaryCanvas = document.getElementById('insight-chart-secondary');

  if (!primaryCanvas || !wrap || !emptyEl) return;

  const primary =
    category === 'calories'
      ? dashboard.getPrimaryChartSeries(category, caloriePeriod)
      : dashboard.getPrimaryChartSeries(category);
  const secondary = dashboard.getSecondaryChartSeries(category);

  const { tick, grid } = axisColors();
  const accent = ACCENT[category] || ACCENT.calories;

  if (!primary?.labels?.length || !primary?.values?.length) {
    wrap.classList.add('hidden');
    emptyEl.classList.remove('hidden');
  } else {
    wrap.classList.remove('hidden');
    emptyEl.classList.add('hidden');

    const isBar = category === 'exercise';
    const calorieGranular =
      category === 'calories' && (caloriePeriod === 'weekly' || caloriePeriod === 'monthly');
    mainChart = new Chart(primaryCanvas, {
      type: isBar ? 'bar' : calorieGranular ? 'bar' : 'line',
      data: {
        labels: primary.labels,
        datasets: [
          {
            label: primary.yAxisLabel || 'Value',
            data: primary.values,
            borderColor: accent.stroke,
            backgroundColor: isBar ? accent.fill : accent.fill,
            borderWidth: isBar || calorieGranular ? 0 : 2,
            fill: !isBar && !calorieGranular,
            tension: isBar || calorieGranular ? 0 : 0.25,
            borderRadius: isBar || calorieGranular ? 6 : 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label(ctx) {
                const raw = ctx.parsed.y ?? ctx.parsed;
                const v =
                  category === 'measurements'
                    ? Number(raw).toFixed(1)
                    : category === 'sleep'
                      ? Number(raw).toFixed(1)
                      : raw;
                const suffix = primary.valueSuffix || '';
                return `${ctx.dataset.label}: ${v}${suffix}`;
              }
            }
          }
        },
        scales: {
          x: {
            ticks: {
              color: tick,
              maxRotation: calorieGranular ? 60 : 45,
              minRotation: 0,
              autoSkip: true,
              maxTicksLimit: calorieGranular ? 18 : 12
            },
            grid: { color: grid }
          },
          y: {
            beginAtZero: category !== 'measurements',
            ticks: {
              color: tick,
              callback(value) {
                return category === 'measurements' ? Number(value).toFixed(1) : value;
              }
            },
            grid: { color: grid },
            title: {
              display: !!primary.yAxisLabel,
              text: primary.yAxisLabel || '',
              color: tick,
              font: { size: 11 }
            }
          }
        }
      }
    });
  }

  if (!secondaryBlock || !secondaryCanvas || !secondaryTitle) return;

  if (!secondary?.labels?.length || !secondary?.values?.length) {
    secondaryBlock.classList.add('hidden');
    return;
  }

  secondaryBlock.classList.remove('hidden');
  secondaryTitle.textContent = secondary.title || 'Breakdown';

  secondaryChart = new Chart(secondaryCanvas, {
    type: 'doughnut',
    data: {
      labels: secondary.labels,
      datasets: [
        {
          data: secondary.values,
          backgroundColor: secondary.colors || [
            'rgba(59, 130, 246, 0.85)',
            'rgba(234, 179, 8, 0.9)',
            'rgba(168, 85, 247, 0.85)',
            'rgba(34, 197, 94, 0.85)',
            'rgba(244, 63, 94, 0.85)',
            'rgba(14, 165, 233, 0.85)'
          ],
          borderWidth: 0
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: {
            color: tick,
            boxWidth: 12,
            font: { size: 11 }
          }
        },
        tooltip: {
          callbacks: {
            label(ctx) {
              const dataArr = ctx.chart.data.datasets[0].data;
              const total = dataArr.reduce((a, b) => a + b, 0);
              const v = ctx.parsed;
              const pct = total > 0 ? Math.round((v / total) * 100) : 0;
              const text = secondary.tooltipFormat ? secondary.tooltipFormat(v) : String(v);
              return `${ctx.label}: ${text} (${pct}%)`;
            }
          }
        }
      }
    }
  });
}
