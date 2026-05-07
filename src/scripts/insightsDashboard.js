import {
  destroyInsightCharts,
  renderHubCorrelationChart,
  renderHubTrendChart,
  renderInsightCharts,
  renderInsightStats
} from './insightsCharts.js';

/**
 * Insights hub + per-category detail pages (loads HealthTrackerDB / localStorage healthEntries).
 * @param {{ category?: 'calories' | 'exercise' | 'sleep' | 'measurements' | null }} options
 */
export class InsightsDashboard {
  constructor(options = {}) {
    this.entries = {};
    /** When set, we're on a dedicated insight page (not the hub). */
    this.category = options.category ?? null;
    this.detailInteractionBound = false;
  }

  async init() {
    await this.loadEntries();
    if (this.category) {
      this.renderCategoryPage();
    } else {
      this.renderHub();
    }
  }

  async loadEntries() {
    const flat = [];
    try {
      if (typeof indexedDB !== 'undefined') {
        const fromDb = await this.loadFromIndexedDB();
        if (fromDb?.length) flat.push(...fromDb);
      }
    } catch (error) {
      console.warn('IndexedDB load failed:', error);
    }
    try {
      const raw = localStorage.getItem('healthEntries');
      if (raw) {
        const parsed = JSON.parse(raw);
        Object.keys(parsed || {}).forEach((key) => {
          if (Array.isArray(parsed[key])) {
            parsed[key].forEach((entry) => flat.push(entry));
          }
        });
      }
    } catch (error) {
      console.warn('Failed to read healthEntries from localStorage:', error);
    }

    const byId = new Map();
    flat.forEach((entry) => {
      if (!entry) return;
      if (entry.id != null && entry.id !== '') {
        byId.set(String(entry.id), entry);
      }
    });
    const withIds = [...byId.values()];
    const orphans = flat.filter((e) => e && (e.id == null || e.id === ''));
    this.entries = this.groupEntriesByDate([...withIds, ...orphans]);
  }

  loadFromIndexedDB() {
    return new Promise((resolve) => {
      try {
        const request = indexedDB.open('HealthTrackerDB', 2);

        request.onsuccess = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains('userEntries')) {
            resolve([]);
            return;
          }

          const tx = db.transaction(['userEntries'], 'readonly');
          const store = tx.objectStore('userEntries');
          const getAllRequest = store.getAll();

          getAllRequest.onsuccess = () => {
            resolve(getAllRequest.result || []);
          };

          getAllRequest.onerror = () => resolve([]);
        };

        request.onerror = () => resolve([]);
      } catch (error) {
        resolve([]);
      }
    });
  }

  groupEntriesByDate(allEntries) {
    const grouped = {};
    allEntries.forEach((entry) => {
      if (!entry || !entry.date) return;
      const dateObj = new Date(entry.date);
      if (isNaN(dateObj.getTime())) return;

      const normalized = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
      const dateKey = normalized.toDateString();
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push({ ...entry, date: normalized });
    });
    return grouped;
  }

  getDatesSorted() {
    return Object.keys(this.entries).sort((a, b) => new Date(a) - new Date(b));
  }

  getAllEntriesWithDate() {
    const rows = [];
    Object.keys(this.entries).forEach((dateKey) => {
      const dayEntries = this.entries[dateKey] || [];
      dayEntries.forEach((entry) => {
        rows.push({
          ...entry,
          __dateKey: dateKey,
          __dateObj: new Date(dateKey)
        });
      });
    });
    return rows.sort((a, b) => b.__dateObj - a.__dateObj);
  }

  toDateParam(dateKey) {
    const d = new Date(dateKey);
    if (isNaN(d.getTime())) return '';
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  getCaloriesInsights() {
    const dates = this.getDatesSorted();
    if (dates.length === 0) {
      return { main: '0 kcal', sub: 'No meal entries yet' };
    }

    const dailyCalories = dates.map((dateKey) => {
      const dayEntries = this.entries[dateKey] || [];
      return dayEntries
        .filter((entry) => entry.type === 'meal')
        .reduce((sum, entry) => sum + (parseFloat(entry.calories) || 0), 0);
    });

    const nonZeroDays = dailyCalories.filter((cals) => cals > 0);
    const avgCalories = nonZeroDays.length
      ? Math.round(nonZeroDays.reduce((sum, cals) => sum + cals, 0) / nonZeroDays.length)
      : 0;
    const latestCalories = dailyCalories[dailyCalories.length - 1] || 0;

    return {
      main: `${avgCalories} kcal`,
      sub: `Avg daily calories · latest day ${Math.round(latestCalories)} kcal`
    };
  }

  getExerciseInsights() {
    const all = Object.values(this.entries).flat();
    const exerciseEntries = all.filter((entry) => entry && (entry.type === 'exercise' || entry.type === 'activity'));
    if (exerciseEntries.length === 0) {
      return { main: '0 sessions', sub: 'No exercise entries yet' };
    }

    const totalDuration = exerciseEntries.reduce(
      (sum, entry) => sum + (parseInt(entry.durationMinutes, 10) || 0),
      0
    );

    return {
      main: `${exerciseEntries.length} sessions`,
      sub: `${totalDuration} min total duration`
    };
  }

  getSleepInsights() {
    const all = Object.values(this.entries).flat();
    const sleepEntries = all.filter((entry) => entry && entry.type === 'sleep');
    if (sleepEntries.length === 0) {
      return { main: '0.0 hrs', sub: 'No sleep entries yet' };
    }

    const sleepDurations = sleepEntries
      .map((entry) => parseFloat(entry.duration))
      .filter((duration) => !isNaN(duration) && duration > 0);

    const avgSleep = sleepDurations.length
      ? (sleepDurations.reduce((sum, d) => sum + d, 0) / sleepDurations.length).toFixed(1)
      : '0.0';

    return {
      main: `${avgSleep} hrs`,
      sub: `Average sleep duration (${sleepDurations.length} nights)`
    };
  }

  getWeightInsights() {
    const dates = this.getDatesSorted();
    const weights = [];

    dates.forEach((dateKey) => {
      const dayEntries = this.entries[dateKey] || [];
      const measurement = dayEntries.find((entry) => entry.type === 'measurements' && entry.weight);
      if (measurement) {
        weights.push({
          date: dateKey,
          value: parseFloat(measurement.weight)
        });
      }
    });

    if (weights.length === 0) {
      return { main: 'No data', sub: 'No weight measurements yet' };
    }

    const latest = weights[weights.length - 1].value;
    const first = weights[0].value;
    const change = latest - first;
    const changeText = `${change >= 0 ? '+' : ''}${change.toFixed(1)} kg`;

    return {
      main: `${latest.toFixed(1)} kg`,
      sub: `Latest weight · change ${changeText}`
    };
  }

  shortDateLabel(dateKey) {
    return new Date(dateKey).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  /** Total kilocalories from meal entries for one grouped day key. */
  totalMealCaloriesForDay(dateKey) {
    const dayEntries = this.entries[dateKey] || [];
    return dayEntries
      .filter((e) => e.type === 'meal')
      .reduce((sum, e) => sum + (parseFloat(e.calories) || 0), 0);
  }

  /** Monday 00:00 local time for the week containing `d`. */
  startOfWeekMonday(d) {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const day = x.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    x.setDate(x.getDate() + diff);
    x.setHours(0, 0, 0, 0);
    return x;
  }

  /**
   * Calorie trend series for the main chart (daily / weekly / monthly buckets).
   * @param {'daily' | 'weekly' | 'monthly'} period
   */
  getCaloriePrimaryChartSeries(period = 'daily') {
    const sumNonZero = (vals) => vals.reduce((a, b) => a + b, 0);

    if (period === 'daily') {
      const days = 42;
      const labels = [];
      const values = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateKey = d.toDateString();
        const total = this.totalMealCaloriesForDay(dateKey);
        labels.push(this.shortDateLabel(dateKey));
        values.push(Math.round(total));
      }
      if (sumNonZero(values) === 0) return null;
      return {
        labels,
        values,
        yAxisLabel: 'kcal / day',
        valueSuffix: ' kcal'
      };
    }

    if (period === 'weekly') {
      const dailyMap = new Map();
      this.getDatesSorted().forEach((dateKey) => {
        const total = this.totalMealCaloriesForDay(dateKey);
        if (total > 0) dailyMap.set(dateKey, total);
      });
      const weekBuckets = new Map();
      dailyMap.forEach((total, dateKey) => {
        const mon = this.startOfWeekMonday(new Date(dateKey));
        const k = mon.getTime();
        weekBuckets.set(k, (weekBuckets.get(k) || 0) + total);
      });
      const sorted = [...weekBuckets.entries()].sort((a, b) => a[0] - b[0]);
      const maxWeeks = 26;
      const slice = sorted.length > maxWeeks ? sorted.slice(-maxWeeks) : sorted;
      if (slice.length === 0 || sumNonZero(slice.map(([, v]) => v)) === 0) return null;
      return {
        labels: slice.map(([t]) => this.shortDateLabel(new Date(t).toDateString())),
        values: slice.map(([, v]) => Math.round(v)),
        yAxisLabel: 'kcal / week (total)',
        valueSuffix: ' kcal'
      };
    }

    if (period === 'monthly') {
      const dailyMap = new Map();
      this.getDatesSorted().forEach((dateKey) => {
        const total = this.totalMealCaloriesForDay(dateKey);
        if (total > 0) dailyMap.set(dateKey, total);
      });
      const monthBuckets = new Map();
      dailyMap.forEach((total, dateKey) => {
        const d = new Date(dateKey);
        const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthBuckets.set(mk, (monthBuckets.get(mk) || 0) + total);
      });
      const sorted = [...monthBuckets.entries()].sort((a, b) => a[0].localeCompare(b[0]));
      const maxMonths = 18;
      const slice = sorted.length > maxMonths ? sorted.slice(-maxMonths) : sorted;
      if (slice.length === 0 || sumNonZero(slice.map(([, v]) => v)) === 0) return null;
      return {
        labels: slice.map(([mk]) => {
          const [y, m] = mk.split('-').map(Number);
          const dt = new Date(y, m - 1, 1);
          return dt.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
        }),
        values: slice.map(([, v]) => Math.round(v)),
        yAxisLabel: 'kcal / month (total)',
        valueSuffix: ' kcal'
      };
    }

    return null;
  }

  /**
   * Time-series / daily data for the main chart on category pages.
   * @param {'daily' | 'weekly' | 'monthly'} [caloriePeriod] — only used when cat is `calories`.
   * @returns {{ labels: string[], values: number[], yAxisLabel?: string, valueSuffix?: string } | null}
   */
  getPrimaryChartSeries(cat, caloriePeriod = 'daily') {
    const maxPts = 90;

    if (cat === 'calories') {
      return this.getCaloriePrimaryChartSeries(caloriePeriod);
    }

    if (cat === 'exercise') {
      const byDay = {};
      this.getAllEntriesWithDate()
        .filter((e) => e.type === 'exercise' || e.type === 'activity')
        .forEach((e) => {
          const dk = e.__dateKey;
          byDay[dk] = (byDay[dk] || 0) + (parseInt(e.durationMinutes, 10) || 0);
        });
      const keys = Object.keys(byDay).sort((a, b) => new Date(a) - new Date(b));
      const labels = keys.map((k) => this.shortDateLabel(k));
      const values = keys.map((k) => byDay[k]);
      const slice = labels.length > maxPts ? -maxPts : 0;
      return {
        labels: slice ? labels.slice(slice) : labels,
        values: slice ? values.slice(slice) : values,
        yAxisLabel: 'Minutes / day',
        valueSuffix: ' min'
      };
    }

    if (cat === 'sleep') {
      const byDay = {};
      this.getAllEntriesWithDate()
        .filter((e) => e.type === 'sleep')
        .forEach((e) => {
          const dk = e.__dateKey;
          const h = parseFloat(e.duration) || 0;
          if (h <= 0) return;
          byDay[dk] = (byDay[dk] || 0) + h;
        });
      const keys = Object.keys(byDay).sort((a, b) => new Date(a) - new Date(b));
      const labels = keys.map((k) => this.shortDateLabel(k));
      const values = keys.map((k) => Math.round(byDay[k] * 10) / 10);
      const slice = labels.length > maxPts ? -maxPts : 0;
      return {
        labels: slice ? labels.slice(slice) : labels,
        values: slice ? values.slice(slice) : values,
        yAxisLabel: 'Hours / night',
        valueSuffix: ' h'
      };
    }

    if (cat === 'measurements') {
      const dates = this.getDatesSorted();
      const labels = [];
      const values = [];
      dates.forEach((dateKey) => {
        const dayEntries = this.entries[dateKey] || [];
        const measurement = dayEntries.find((entry) => entry.type === 'measurements' && entry.weight);
        if (measurement) {
          labels.push(this.shortDateLabel(dateKey));
          values.push(parseFloat(measurement.weight));
        }
      });
      const slice = labels.length > maxPts ? -maxPts : 0;
      return {
        labels: slice ? labels.slice(slice) : labels,
        values: slice ? values.slice(slice) : values,
        yAxisLabel: 'Weight (kg)',
        valueSuffix: ' kg'
      };
    }

    return null;
  }

  /**
   * Second doughnut chart when breakdown data exists.
   */
  getSecondaryChartSeries(cat) {
    if (cat === 'calories') {
      const all = Object.values(this.entries).flat().filter((e) => e.type === 'meal');
      let p = 0;
      let c = 0;
      let f = 0;
      all.forEach((e) => {
        p += parseFloat(e.protein) || 0;
        c += parseFloat(e.carbs) || 0;
        f += parseFloat(e.fats) || 0;
      });
      const pk = p * 4;
      const ck = c * 4;
      const fk = f * 9;
      const sum = pk + ck + fk;
      if (sum < 1) return null;
      return {
        title: 'Macros (kcal from logged grams)',
        labels: ['Protein', 'Carbs', 'Fats'],
        values: [pk, ck, fk],
        tooltipFormat: (v) => `${Math.round(v)} kcal`
      };
    }

    if (cat === 'exercise') {
      const byName = {};
      Object.values(this.entries)
        .flat()
        .filter((e) => e && (e.type === 'exercise' || e.type === 'activity'))
        .forEach((e) => {
          const name = (e.name && String(e.name).trim()) || 'Exercise';
          const mins = parseInt(e.durationMinutes, 10) || 0;
          byName[name] = (byName[name] || 0) + mins;
        });
      let pairs = Object.entries(byName).sort((a, b) => b[1] - a[1]);
      if (pairs.length === 0) return null;
      if (pairs.length > 8) {
        const head = pairs.slice(0, 7);
        const restMin = pairs.slice(7).reduce((s, [, v]) => s + v, 0);
        pairs = [...head, ['Other', restMin]];
      }
      return {
        title: 'Time by activity',
        labels: pairs.map(([k]) => k),
        values: pairs.map(([, v]) => v),
        tooltipFormat: (v) => `${v} min`
      };
    }

    return null;
  }

  /** Four summary tiles for the category page grid. */
  computeInsightStats(category) {
    if (category === 'calories') {
      const dates = this.getDatesSorted();
      let mealCount = 0;
      let totalKcal = 0;
      let daysWith = 0;
      let maxDay = 0;
      let minDay = Infinity;
      dates.forEach((dk) => {
        const dayEntries = this.entries[dk] || [];
        const meals = dayEntries.filter((e) => e.type === 'meal');
        const dayTotal = meals.reduce((s, e) => s + (parseFloat(e.calories) || 0), 0);
        mealCount += meals.length;
        if (dayTotal > 0) {
          daysWith += 1;
          totalKcal += dayTotal;
          maxDay = Math.max(maxDay, dayTotal);
          minDay = Math.min(minDay, dayTotal);
        }
      });
      if (minDay === Infinity) minDay = 0;
      const avg = daysWith ? Math.round(totalKcal / daysWith) : 0;
      return [
        { label: 'Meals logged', value: String(mealCount) },
        { label: 'Days with intake', value: String(daysWith) },
        { label: 'Total kcal', value: `${Math.round(totalKcal).toLocaleString()} kcal` },
        { label: 'Avg / day (logged days)', value: `${avg} kcal` }
      ];
    }

    if (category === 'exercise') {
      const ex = this.getAllEntriesWithDate().filter((e) => e.type === 'exercise' || e.type === 'activity');
      const sessions = ex.length;
      const totalMin = ex.reduce((s, e) => s + (parseInt(e.durationMinutes, 10) || 0), 0);
      const avgMin = sessions ? Math.round(totalMin / sessions) : 0;
      const activeDays = new Set(ex.map((e) => e.__dateKey)).size;
      return [
        { label: 'Sessions', value: String(sessions) },
        { label: 'Total duration', value: `${totalMin} min` },
        { label: 'Avg / session', value: `${avgMin} min` },
        { label: 'Days with exercise', value: String(activeDays) }
      ];
    }

    if (category === 'sleep') {
      const rows = this.getAllEntriesWithDate().filter((e) => e.type === 'sleep');
      const hours = rows.map((e) => parseFloat(e.duration) || 0).filter((h) => h > 0);
      if (hours.length === 0) {
        return [
          { label: 'Nights logged', value: '0' },
          { label: 'Avg sleep', value: '—' },
          { label: 'Longest night', value: '—' },
          { label: 'Shortest night', value: '—' }
        ];
      }
      const sum = hours.reduce((a, b) => a + b, 0);
      const avg = (sum / hours.length).toFixed(1);
      const longest = Math.max(...hours).toFixed(1);
      const shortest = Math.min(...hours).toFixed(1);
      const totalHrs = sum.toFixed(1);
      return [
        { label: 'Nights logged', value: String(hours.length) },
        { label: 'Avg sleep', value: `${avg} hrs` },
        { label: 'Longest · shortest', value: `${longest} · ${shortest} hrs` },
        { label: 'Total (logged)', value: `${totalHrs} hrs` }
      ];
    }

    if (category === 'measurements') {
      const dates = this.getDatesSorted();
      const weights = [];
      dates.forEach((dateKey) => {
        const dayEntries = this.entries[dateKey] || [];
        const measurement = dayEntries.find((entry) => entry.type === 'measurements' && entry.weight);
        if (measurement) {
          weights.push({ dateKey, value: parseFloat(measurement.weight) });
        }
      });
      if (weights.length === 0) {
        return [
          { label: 'Weigh-ins', value: '0' },
          { label: 'Latest', value: '—' },
          { label: 'Change (first → last)', value: '—' },
          { label: 'Range', value: '—' }
        ];
      }
      const first = weights[0].value;
      const last = weights[weights.length - 1].value;
      const change = last - first;
      const vals = weights.map((w) => w.value);
      const lo = Math.min(...vals);
      const hi = Math.max(...vals);
      return [
        { label: 'Weigh-ins', value: String(weights.length) },
        { label: 'Latest weight', value: `${last.toFixed(1)} kg` },
        { label: 'Change (first → last)', value: `${change >= 0 ? '+' : ''}${change.toFixed(1)} kg` },
        { label: 'Min · max', value: `${lo.toFixed(1)} · ${hi.toFixed(1)} kg` }
      ];
    }

    return [];
  }

  /**
   * Consecutive-day logging streak metrics across all entry types.
   * @returns {{ current: number, best: number, totalDays: number }}
   */
  getLoggingStreakInsights() {
    const dates = this.getDatesSorted();
    if (!dates.length) return { current: 0, best: 0, totalDays: 0 };

    const dayTimes = dates.map((d) => {
      const x = new Date(d);
      return new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    });
    const daySet = new Set(dayTimes);

    let best = 1;
    let run = 1;
    for (let i = 1; i < dayTimes.length; i += 1) {
      const prev = dayTimes[i - 1];
      const cur = dayTimes[i];
      if (cur - prev === 24 * 60 * 60 * 1000) {
        run += 1;
      } else {
        run = 1;
      }
      best = Math.max(best, run);
    }

    const mostRecent = dayTimes[dayTimes.length - 1];
    let current = 0;
    let cursor = mostRecent;
    while (daySet.has(cursor)) {
      current += 1;
      cursor -= 24 * 60 * 60 * 1000;
    }

    return { current, best, totalDays: dayTimes.length };
  }

  /** @returns {Map<string, number>} */
  getDailySleepHoursMap() {
    const map = new Map();
    this.getAllEntriesWithDate()
      .filter((e) => e.type === 'sleep')
      .forEach((e) => {
        const h = parseFloat(e.duration) || 0;
        if (h <= 0) return;
        map.set(e.__dateKey, (map.get(e.__dateKey) || 0) + h);
      });
    return map;
  }

  /**
   * @param {'weekly' | 'monthly'} period
   * @returns {{ labels: string[], calories: number[], sleep: number[] } | null}
   */
  getHubTrendSeries(period = 'weekly') {
    const calorieByDay = new Map();
    this.getDatesSorted().forEach((dateKey) => {
      calorieByDay.set(dateKey, this.totalMealCaloriesForDay(dateKey));
    });
    const sleepByDay = this.getDailySleepHoursMap();
    const buckets = new Map();

    const allDateKeys = new Set([...calorieByDay.keys(), ...sleepByDay.keys()]);
    allDateKeys.forEach((dateKey) => {
      const dt = new Date(dateKey);
      if (isNaN(dt.getTime())) return;
      let bucketKey = '';
      let bucketLabel = '';
      if (period === 'weekly') {
        const w = this.startOfWeekMonday(dt);
        bucketKey = String(w.getTime());
        bucketLabel = this.shortDateLabel(w.toDateString());
      } else {
        bucketKey = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
        bucketLabel = dt.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
      }
      if (!buckets.has(bucketKey)) {
        buckets.set(bucketKey, {
          label: bucketLabel,
          calories: 0,
          sleep: 0,
          calorieDays: 0,
          sleepDays: 0
        });
      }
      const row = buckets.get(bucketKey);
      const cals = calorieByDay.get(dateKey) || 0;
      const sleep = sleepByDay.get(dateKey) || 0;
      if (cals > 0) {
        row.calories += cals;
        row.calorieDays += 1;
      }
      if (sleep > 0) {
        row.sleep += sleep;
        row.sleepDays += 1;
      }
    });

    const sorted = [...buckets.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    const maxPoints = period === 'weekly' ? 20 : 12;
    const slice = sorted.length > maxPoints ? sorted.slice(-maxPoints) : sorted;
    if (!slice.length) return null;

    const labels = [];
    const calories = [];
    const sleep = [];
    slice.forEach(([, row]) => {
      labels.push(row.label);
      calories.push(row.calorieDays ? Math.round(row.calories / row.calorieDays) : 0);
      sleep.push(row.sleepDays ? Math.round((row.sleep / row.sleepDays) * 10) / 10 : 0);
    });
    if (!calories.some((v) => v > 0) && !sleep.some((v) => v > 0)) return null;
    return { labels, calories, sleep };
  }

  /**
   * @returns {{ points: { x: number, y: number }[], r: number | null, n: number } | null}
   */
  getSleepCaloriesCorrelation() {
    const sleepByDay = this.getDailySleepHoursMap();
    const points = [];
    this.getDatesSorted().forEach((dateKey) => {
      const sleep = sleepByDay.get(dateKey) || 0;
      const calories = this.totalMealCaloriesForDay(dateKey);
      if (sleep > 0 && calories > 0) {
        points.push({ x: sleep, y: Math.round(calories) });
      }
    });
    if (points.length < 2) return null;

    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const meanX = xs.reduce((a, b) => a + b, 0) / xs.length;
    const meanY = ys.reduce((a, b) => a + b, 0) / ys.length;
    let num = 0;
    let denX = 0;
    let denY = 0;
    for (let i = 0; i < points.length; i += 1) {
      const dx = xs[i] - meanX;
      const dy = ys[i] - meanY;
      num += dx * dy;
      denX += dx * dx;
      denY += dy * dy;
    }
    const den = Math.sqrt(denX * denY);
    const r = den > 0 ? num / den : null;
    return { points, r, n: points.length };
  }

  setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  createActionButton(label, action, entryId, dateParam, colorClass) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `p-2 sm:p-2 text-gray-400 transition-colors touch-manipulation shrink-0 ${colorClass}`;
    btn.setAttribute('data-action', action);
    btn.setAttribute('data-entry-id', String(entryId));
    btn.setAttribute('data-date', dateParam);
    btn.title = label;
    btn.setAttribute('aria-label', label);

    let iconPath = '';
    if (action === 'info') {
      iconPath = 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
    } else if (action === 'edit') {
      iconPath = 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z';
    } else {
      iconPath = 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16';
    }

    btn.innerHTML = `
        <svg class="w-4 h-4 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${iconPath}" />
        </svg>
      `;
    return btn;
  }

  renderExerciseDetails(detailList, emptyState) {
    const allEntries = this.getAllEntriesWithDate().filter((entry) => entry.type === 'exercise' || entry.type === 'activity');
    if (!allEntries.length) {
      emptyState.classList.remove('hidden');
      return;
    }

    emptyState.classList.add('hidden');
    const groupedByDate = {};
    allEntries.forEach((entry) => {
      if (!groupedByDate[entry.__dateKey]) groupedByDate[entry.__dateKey] = [];
      groupedByDate[entry.__dateKey].push(entry);
    });

    Object.keys(groupedByDate).forEach((dateKey) => {
      const dateParam = this.toDateParam(dateKey);

      const headerLi = document.createElement('li');
      headerLi.className = 'text-xs font-semibold uppercase tracking-wide text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 rounded-lg px-3 py-2';
      headerLi.textContent = new Date(dateKey).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
      detailList.appendChild(headerLi);

      groupedByDate[dateKey].forEach((entry) => {
        const cardLi = document.createElement('li');
        cardLi.className = 'rounded-xl border transition-all duration-200 border-blue-500/30 bg-gray-50 dark:bg-[var(--color-bg-muted)] overflow-hidden';

        const header = document.createElement('div');
        header.className = 'flex items-center gap-2.5 px-3.5 py-2.5 cursor-pointer select-none';

        const title = document.createElement('div');
        title.className = 'flex-1 font-semibold text-sm text-gray-900 dark:text-white';
        title.textContent = `${entry.name || 'Exercise'}`;
        header.appendChild(title);

        const chevron = document.createElement('span');
        chevron.className = 'text-gray-500 dark:text-gray-400 shrink-0 text-xs';
        chevron.textContent = '▼';
        header.appendChild(chevron);

        cardLi.appendChild(header);

        const body = document.createElement('div');
        body.className = 'px-3.5 pb-3.5 space-y-3 border-t border-gray-200 dark:border-gray-600/50 pt-3 hidden';

        if (entry.type === 'activity') {
          const parts = [];
          if (entry.durationMinutes) parts.push(`⏱ ${entry.durationMinutes} min`);
          if (entry.distance) parts.push(`📍 ${entry.distance} km`);
          if (entry.steps) parts.push(`👟 ${Number(entry.steps).toLocaleString()} steps`);
          if (parts.length > 0) {
            const actBlock = document.createElement('div');
            actBlock.className = 'mt-1 text-xs text-gray-600 dark:text-gray-400 flex flex-wrap gap-2';
            actBlock.textContent = parts.join('  ·  ');
            body.appendChild(actBlock);
          }
        } else if (Array.isArray(entry.sets) && entry.sets.length > 0) {
          const setsBlock = document.createElement('div');
          setsBlock.className = 'mt-1 text-xs text-gray-600 dark:text-gray-400 leading-5';
          entry.sets.forEach((set, index) => {
            const setRow = document.createElement('div');
            const reps = set?.reps != null && String(set.reps).trim() !== '' ? `${set.reps} reps` : '— reps';
            const load = set?.load != null && String(set.load).trim() !== '' ? `${set.load}` : '—';
            setRow.textContent = `Set ${index + 1}: ${load} x ${reps}`;
            setsBlock.appendChild(setRow);
          });
          body.appendChild(setsBlock);
        }

        if (entry.notes && String(entry.notes).trim() !== '') {
          const notes = document.createElement('div');
          notes.className = 'mt-1 text-xs text-gray-500 dark:text-gray-400';
          notes.textContent = `Notes: ${entry.notes}`;
          body.appendChild(notes);
        }

        const actions = document.createElement('div');
        actions.className = 'mt-2 flex items-center gap-1 sm:gap-2 flex-wrap';
        actions.appendChild(this.createActionButton('Add notes', 'info', entry.id, dateParam, 'insight-action-info'));
        actions.appendChild(this.createActionButton('Edit', 'edit', entry.id, dateParam, 'insight-action-edit'));
        actions.appendChild(this.createActionButton('Delete', 'delete', entry.id, dateParam, 'insight-action-delete'));
        body.appendChild(actions);

        header.addEventListener('click', () => {
          body.classList.toggle('hidden');
          chevron.textContent = body.classList.contains('hidden') ? '▼' : '▲';
        });

        cardLi.appendChild(body);

        detailList.appendChild(cardLi);
      });
    });
  }

  async deleteEntry(entryId) {
    const idAsNumber = Number(entryId);
    const idToDelete = Number.isNaN(idAsNumber) ? entryId : idAsNumber;

    try {
      if (typeof indexedDB !== 'undefined') {
        await new Promise((resolve) => {
          const request = indexedDB.open('HealthTrackerDB', 2);
          request.onsuccess = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains('userEntries')) {
              resolve();
              return;
            }
            const tx = db.transaction(['userEntries'], 'readwrite');
            const store = tx.objectStore('userEntries');
            store.delete(idToDelete);
            tx.oncomplete = () => resolve();
            tx.onerror = () => resolve();
          };
          request.onerror = () => resolve();
        });
      }
    } catch (error) {
      console.warn('IndexedDB delete failed:', error);
    }

    try {
      const raw = localStorage.getItem('healthEntries');
      if (raw) {
        const parsed = JSON.parse(raw);
        Object.keys(parsed || {}).forEach((key) => {
          if (Array.isArray(parsed[key])) {
            parsed[key] = parsed[key].filter((entry) => String(entry?.id) !== String(entryId));
          }
        });
        localStorage.setItem('healthEntries', JSON.stringify(parsed));
      }
    } catch (error) {
      console.warn('localStorage delete failed:', error);
    }
  }

  setupDetailInteractions() {
    const detailList = document.getElementById('insight-detail-list');
    if (!detailList || this.detailInteractionBound) return;

    detailList.addEventListener('click', async (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const btn = target.closest('button[data-action]');
      if (!btn) return;

      const action = btn.getAttribute('data-action');
      const entryId = btn.getAttribute('data-entry-id');
      const dateParam = btn.getAttribute('data-date');
      if (!action || !entryId || !dateParam) return;

      if (action === 'info') {
        window.location.href = `/?date=${encodeURIComponent(dateParam)}&info=${encodeURIComponent(entryId)}`;
        return;
      }
      if (action === 'edit') {
        window.location.href = `/?date=${encodeURIComponent(dateParam)}&edit=${encodeURIComponent(entryId)}`;
        return;
      }
      if (action === 'delete') {
        const ok = window.confirm('Delete this exercise entry?');
        if (!ok) return;
        await this.deleteEntry(entryId);
        await this.loadEntries();
        this.refreshAfterDataChange();
      }
    });
    this.detailInteractionBound = true;
  }

  refreshAfterDataChange() {
    if (this.category) {
      this.renderCategoryPage();
    } else {
      this.renderHub();
    }
  }

  buildDetailRows(category) {
    const allEntries = this.getAllEntriesWithDate();
    if (category === 'calories') {
      const byDate = this.getDatesSorted().map((dateKey) => {
        const dayEntries = this.entries[dateKey] || [];
        const total = dayEntries
          .filter((entry) => entry.type === 'meal')
          .reduce((sum, entry) => sum + (parseFloat(entry.calories) || 0), 0);
        return { date: dateKey, text: `${Math.round(total)} kcal total` };
      }).filter((row) => row.text !== '0 kcal total');
      return byDate.reverse();
    }

    if (category === 'exercise') {
      return allEntries
        .filter((entry) => entry.type === 'exercise' || entry.type === 'activity')
        .map((entry) => {
          const parts = [];
          if (entry.durationMinutes) parts.push(`${entry.durationMinutes} min`);
          if (entry.distance) parts.push(`${entry.distance} km`);
          if (entry.steps) parts.push(`${Number(entry.steps).toLocaleString()} steps`);
          return {
            date: entry.__dateKey,
            text: `${entry.name || (entry.type === 'activity' ? 'Activity' : 'Exercise')}${parts.length ? ' - ' + parts.join(' · ') : ''}`
          };
        });
    }

    if (category === 'sleep') {
      return allEntries
        .filter((entry) => entry.type === 'sleep')
        .map((entry) => ({
          date: entry.__dateKey,
          text: `${entry.duration ? `${entry.duration} hrs` : 'Sleep entry'}`
        }));
    }

    return allEntries
      .filter((entry) => entry.type === 'measurements' && entry.weight)
      .map((entry) => ({
        date: entry.__dateKey,
        text: `Weight: ${parseFloat(entry.weight).toFixed(1)} kg`
      }));
  }

  renderDetails(category) {
    const detailTitle = document.getElementById('insight-detail-title');
    const detailList = document.getElementById('insight-detail-list');
    const emptyState = document.getElementById('insight-detail-empty');
    if (!detailTitle || !detailList || !emptyState) return;

    const titleMap = {
      calories: 'Calories Details',
      exercise: 'Exercise Details',
      sleep: 'Sleep Details',
      measurements: 'Measurements Details'
    };
    detailTitle.textContent = titleMap[category] || 'Details';
    detailList.innerHTML = '';

    if (category === 'exercise') {
      this.renderExerciseDetails(detailList, emptyState);
      return;
    }

    const rows = this.buildDetailRows(category);

    if (!rows.length) {
      emptyState.classList.remove('hidden');
      return;
    }

    emptyState.classList.add('hidden');
    rows.forEach((row) => {
      const li = document.createElement('li');
      li.className = 'text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 flex items-center justify-between gap-3';
      const dateText = new Date(row.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
      li.innerHTML = `<span>${row.text}</span><span class="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">${dateText}</span>`;
      detailList.appendChild(li);
    });
  }

  /** Hub: summary cards only (cards are links to subpages). */
  renderHub() {
    const calories = this.getCaloriesInsights();
    const exercise = this.getExerciseInsights();
    const sleep = this.getSleepInsights();
    const weight = this.getWeightInsights();
    const streak = this.getLoggingStreakInsights();

    this.setText('insight-calories-main', calories.main);
    this.setText('insight-calories-sub', calories.sub);
    this.setText('insight-exercise-main', exercise.main);
    this.setText('insight-exercise-sub', exercise.sub);
    this.setText('insight-sleep-main', sleep.main);
    this.setText('insight-sleep-sub', sleep.sub);
    this.setText('insight-weight-main', weight.main);
    this.setText('insight-weight-sub', weight.sub);
    this.setText('insight-streak-current', `${streak.current} day${streak.current === 1 ? '' : 's'}`);
    this.setText('insight-streak-best', `${streak.best} day${streak.best === 1 ? '' : 's'}`);
    this.setText('insight-streak-total', String(streak.totalDays));

    renderHubTrendChart(this, 'weekly');
    const corr = this.getSleepCaloriesCorrelation();
    renderHubCorrelationChart(corr);
  }

  renderCategoryPage() {
    const cat = this.category;
    if (!cat) return;

    destroyInsightCharts();

    const getters = {
      calories: () => this.getCaloriesInsights(),
      exercise: () => this.getExerciseInsights(),
      sleep: () => this.getSleepInsights(),
      measurements: () => this.getWeightInsights()
    };
    const data = getters[cat]?.() || { main: '—', sub: '' };
    this.setText('insight-page-main', data.main);
    this.setText('insight-page-sub', data.sub);

    renderInsightStats(this.computeInsightStats(cat));
    this.renderDetails(cat);
    renderInsightCharts(cat, this);
    this.setupDetailInteractions();
  }
}
