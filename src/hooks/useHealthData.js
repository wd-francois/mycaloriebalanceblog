import { useState, useEffect, useCallback, useRef } from 'react';
import healthDB from '../lib/database';
import { groupEntriesByDate } from '../lib/dateUtils';

export function useHealthData() {
    const [entries, setEntries] = useState({});
    const [isDBInitialized, setIsDBInitialized] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const mountedRef = useRef(true);

    // Helper to load from localStorage as fallback
    const loadFromLocalStorage = useCallback(() => {
        if (typeof window === 'undefined') return {};
        try {
            const parsed = healthDB.getHealthEntries();

            // Flatten per-day arrays, then regroup by each entry's own
            // (normalized) date — matches the previous behavior where
            // entries are keyed by their own date, not the raw storage key.
            const flat = [];
            Object.values(parsed).forEach(dateEntries => {
                if (Array.isArray(dateEntries)) flat.push(...dateEntries);
            });

            return groupEntriesByDate(flat);
        } catch (error) {
            console.error('Error loading from localStorage:', error);
            return {};
        }
    }, []);

    // Load (or reload) everything from IndexedDB — shared by the initial
    // mount effect and by refresh(), so refreshing doesn't need a full
    // page reload.
    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            await healthDB.init();
            if (!mountedRef.current) return;
            setIsDBInitialized(true);

            // Try to migrate from localStorage if needed
            await healthDB.migrateFromLocalStorage();

            // Load all entries
            const dbEntries = await healthDB.getAllUserEntries();

            // Load photos
            let photoEntries = [];
            try {
                photoEntries = await healthDB.getAllPhotoEntries();
            } catch (e) {
                console.warn('Could not load photo entries:', e);
            }

            const photosByEntryId = {};
            photoEntries.forEach(p => {
                const entryId = p.entryId || p.id;
                if (entryId && p.photo) photosByEntryId[entryId] = p.photo;
            });

            // Format entries
            const formattedEntries = groupEntriesByDate(dbEntries, (e) => e.date, (entry, entryDate) => {
                const entryPhoto = photosByEntryId[entry.id] || entry.photo;
                return {
                    ...entry,
                    date: entryDate,
                    photo: entryPhoto || entry.photo
                };
            });

            if (mountedRef.current) {
                setEntries(formattedEntries);
                setLoading(false);
            }
        } catch (err) {
            console.error('Error initializing/loading data:', err);
            if (mountedRef.current) {
                // Fallback to localStorage
                const localEntries = loadFromLocalStorage();
                setEntries(localEntries);
                setError(err);
                setLoading(false);
            }
        }
    }, [loadFromLocalStorage]);

    // Initialize DB and load entries
    useEffect(() => {
        mountedRef.current = true;
        loadData();

        return () => {
            mountedRef.current = false;
        };
    }, [loadData]);

    // CRUD Operations
    const addEntry = async (entry) => {
        try {
            const dateKey = entry.date.toDateString();

            // Optimistic update
            setEntries(prev => {
                const current = prev[dateKey] || [];
                return {
                    ...prev,
                    [dateKey]: [...current, entry]
                };
            });

            if (isDBInitialized) {
                try {
                    await healthDB.saveUserEntry(entry);
                    if (entry.photo?.dataUrl) {
                        // Build photo record similar to DateTimeSelector
                        const photoRecord = {
                            id: entry.id,
                            entryId: entry.id,
                            date: entry.date.toISOString(),
                            time: entry.time,
                            type: entry.type,
                            name: entry.name,
                            photo: entry.photo,
                            timestamp: (entry.photo.capturedAt ? new Date(entry.photo.capturedAt) : entry.date).toISOString()
                        };
                        await healthDB.savePhotoEntry(photoRecord);
                    }
                } catch (dbError) {
                    console.warn('IndexedDB save failed, using localStorage fallback:', dbError);
                    // Fallback to localStorage
                    const currentData = healthDB.getHealthEntries();
                    if (!currentData[dateKey]) {
                        currentData[dateKey] = [];
                    }
                    currentData[dateKey].push(entry);
                    healthDB.saveHealthEntries(currentData);
                }
            } else {
                // If DB not initialized, save to localStorage
                const currentData = healthDB.getHealthEntries();
                if (!currentData[dateKey]) {
                    currentData[dateKey] = [];
                }
                currentData[dateKey].push(entry);
                healthDB.saveHealthEntries(currentData);
            }
        } catch (err) {
            console.error('Error adding entry:', err);
            setError(err);
            alert('Failed to save entry. Please try again.');
        }
    };

    const updateEntry = async (entry) => {
        try {
            const dateKey = entry.date.toDateString();

            setEntries(prev => ({
                ...prev,
                [dateKey]: (prev[dateKey] || []).map(e => e.id === entry.id ? entry : e)
            }));

            if (isDBInitialized) {
                try {
                    await healthDB.saveUserEntry(entry);
                    // Handle photo update (syncPhotoEntry logic)
                    if (entry.photo?.dataUrl) {
                        const photoRecord = {
                            id: entry.id,
                            entryId: entry.id,
                            date: entry.date.toISOString(),
                            time: entry.time,
                            type: entry.type,
                            name: entry.name,
                            photo: entry.photo,
                            timestamp: (entry.photo.capturedAt ? new Date(entry.photo.capturedAt) : entry.date).toISOString()
                        };
                        await healthDB.savePhotoEntry(photoRecord);
                    } else {
                        // If photo was removed, try to delete it
                        try {
                            await healthDB.deletePhotoEntry(entry.id);
                        } catch (deleteErr) {
                            // Ignore delete errors (photo might not exist)
                            console.warn('Could not delete photo entry:', deleteErr);
                        }
                    }
                } catch (dbError) {
                    console.warn('IndexedDB update failed, using localStorage fallback:', dbError);
                    // Fallback to localStorage
                    const currentData = healthDB.getHealthEntries();
                    if (!currentData[dateKey]) {
                        currentData[dateKey] = [];
                    }
                    const entryIndex = currentData[dateKey].findIndex(e => e.id === entry.id);
                    if (entryIndex >= 0) {
                        currentData[dateKey][entryIndex] = entry;
                    } else {
                        currentData[dateKey].push(entry);
                    }
                    healthDB.saveHealthEntries(currentData);
                }
            } else {
                // If DB not initialized, save to localStorage
                const currentData = healthDB.getHealthEntries();
                if (!currentData[dateKey]) {
                    currentData[dateKey] = [];
                }
                const entryIndex = currentData[dateKey].findIndex(e => e.id === entry.id);
                if (entryIndex >= 0) {
                    currentData[dateKey][entryIndex] = entry;
                } else {
                    currentData[dateKey].push(entry);
                }
                healthDB.saveHealthEntries(currentData);
            }
        } catch (err) {
            console.error('Error updating entry:', err);
            setError(err);
        }
    };

    const deleteEntry = async (entryId, date) => {
        try {
            const dateKey = date.toDateString();

            setEntries(prev => ({
                ...prev,
                [dateKey]: (prev[dateKey] || []).filter(e => e.id !== entryId)
            }));

            if (isDBInitialized) {
                try {
                    await healthDB.deleteUserEntry(entryId);
                    await healthDB.deletePhotoEntry(entryId);
                } catch (dbError) {
                    console.warn('IndexedDB delete failed, using localStorage fallback:', dbError);
                    // Fallback to localStorage
                    const currentData = healthDB.getHealthEntries();
                    if (currentData[dateKey]) {
                        currentData[dateKey] = currentData[dateKey].filter(e => e.id !== entryId);
                        healthDB.saveHealthEntries(currentData);
                    }
                }
            } else {
                // If DB not initialized, delete from localStorage
                const currentData = healthDB.getHealthEntries();
                if (currentData[dateKey]) {
                    currentData[dateKey] = currentData[dateKey].filter(e => e.id !== entryId);
                    healthDB.saveHealthEntries(currentData);
                }
            }
        } catch (err) {
            console.error('Error deleting entry:', err);
            setError(err);
        }
    };

    const refresh = useCallback(() => loadData(), [loadData]);

    return {
        entries,
        loading,
        isDBInitialized,
        error,
        addEntry,
        updateEntry,
        deleteEntry,
        refresh
    };
}
