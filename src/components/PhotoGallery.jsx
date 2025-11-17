import React, { useEffect, useMemo, useState } from 'react';
import healthDB from '../lib/database.js';

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric'
});

function formatEntryTime(time) {
  if (!time || typeof time !== 'object') {
    return '';
  }
  const { hour = 0, minute = 0, period = 'AM' } = time;
  const paddedMinute = minute.toString().padStart(2, '0');
  return `${hour}:${paddedMinute} ${period}`;
}

function normalizeEntries(rawEntries = []) {
  if (!Array.isArray(rawEntries)) return [];
  return rawEntries.map((entry) => {
    if (!entry) return null;
    let entryDate = entry.date;
    if (entryDate && !(entryDate instanceof Date)) {
      entryDate = new Date(entryDate);
    }
    return {
      ...entry,
      date: entryDate instanceof Date && !isNaN(entryDate.valueOf()) ? entryDate : new Date()
    };
  }).filter(Boolean);
}

function loadEntriesFromLocalStorage() {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem('healthEntries');
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    if (!parsed || typeof parsed !== 'object') return [];
    const entries = [];
    Object.values(parsed).forEach((value) => {
      if (Array.isArray(value)) {
        entries.push(...value);
      }
    });
    return entries;
  } catch (error) {
    console.error('Error loading entries from localStorage:', error);
    return [];
  }
}

function groupPhotosByDate(entries) {
  const grouped = {};

  entries.forEach((entry) => {
    if (!entry?.photo?.dataUrl) return;
    const entryDate = entry.date instanceof Date ? entry.date : new Date(entry.date || entry.photo.capturedAt);
    const dateKey = entryDate.toDateString();
    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }
    const capturedAt = entry.photo.capturedAt ? new Date(entry.photo.capturedAt) : entryDate;
    grouped[dateKey].push({
      id: `${entry.id || entryDate.valueOf()}-${capturedAt.valueOf()}`,
      image: entry.photo.dataUrl,
      entryName: entry.name || 'Untitled entry',
      entryType: entry.type || 'meal',
      timeLabel: formatEntryTime(entry.time) || capturedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestamp: capturedAt,
      timestampLabel: capturedAt.toLocaleString()
    });
  });

  return Object.keys(grouped)
    .sort((a, b) => new Date(b) - new Date(a))
    .map((dateKey) => ({
      dateKey,
      dateLabel: dateFormatter.format(new Date(dateKey)),
      photos: grouped[dateKey].sort((a, b) => b.timestamp - a.timestamp)
    }));
}

function getTypeLabel(type) {
  switch (type) {
    case 'exercise':
      return 'Exercise';
    case 'sleep':
      return 'Sleep';
    case 'measurements':
      return 'Measurements';
    default:
      return 'Meal';
  }
}

const PhotoGallery = () => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const fetchEntriesWithPhotos = async () => {
      if (typeof window === 'undefined') return;

      try {
        await healthDB.init();
        const dbEntries = await healthDB.getAllUserEntries();
        if (!cancelled) {
          const normalized = normalizeEntries(dbEntries);
          if (normalized.length === 0) {
            const fallback = normalizeEntries(loadEntriesFromLocalStorage());
            setEntries(fallback);
          } else {
            setEntries(normalized);
          }
        }
      } catch (dbError) {
        console.warn('Falling back to localStorage for gallery photos:', dbError);
        if (!cancelled) {
          setError('Unable to access the database. Showing any locally saved photos instead.');
          setEntries(normalizeEntries(loadEntriesFromLocalStorage()));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchEntriesWithPhotos();

    return () => {
      cancelled = true;
    };
  }, []);

  const groupedPhotos = useMemo(() => groupPhotosByDate(entries), [entries]);

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <p className="text-gray-600 text-center">Loading your photo gallery...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Photo Gallery</h1>
        <p className="text-gray-600">
          Every photo you attach while logging entries is stored here, organized by the date and time of the entry.
        </p>
        {error && (
          <p className="mt-3 text-sm text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-4 py-2">
            {error}
          </p>
        )}
      </div>

      {groupedPhotos.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-8 text-center">
          <p className="text-lg font-medium text-gray-900 mb-2">No photos yet</p>
          <p className="text-gray-600">
            Start attaching photos to your meals, workouts, or measurements. They will automatically appear in this
            gallery grouped by date and time.
          </p>
        </div>
      ) : (
        groupedPhotos.map((group) => (
          <section key={group.dateKey} className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{group.dateLabel}</h2>
                <p className="text-sm text-gray-500">{group.photos.length} photo{group.photos.length !== 1 ? 's' : ''}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {group.photos.map((photo) => (
                <article key={photo.id} className="border border-gray-200 rounded-xl overflow-hidden bg-white flex flex-col">
                  <div className="aspect-video bg-gray-100">
                    <img
                      src={photo.image}
                      alt={`Photo for ${photo.entryName}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-4 space-y-1">
                    <p className="text-sm font-medium text-gray-900">{photo.entryName}</p>
                    <p className="text-xs text-gray-500">
                      {getTypeLabel(photo.entryType)} • {photo.timeLabel}
                    </p>
                    <p className="text-xs text-gray-400">{photo.timestampLabel}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
};

export default PhotoGallery;

