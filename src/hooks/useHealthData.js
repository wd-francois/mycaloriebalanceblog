import { useState, useEffect, useCallback } from 'react';
import healthDB from '../lib/database';

export function useHealthData() {
    const [entries, setEntries] = useState({});
    const [isDBInitialized, setIsDBInitialized] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Helper to load from localStorage as fallback
    const loadFromLocalStorage = useCallback(() => {
        if (typeof window === 'undefined') return {};
        try {
            const saved = localStorage.getItem('healthEntries');
            if (!saved) return {};
            const parsed = JSON.parse(saved);

            // Convert localStorage entries to proper format with normalized dates
            const formattedEntries = {};
            Object.keys(parsed).forEach(dateKey => {
                const dateEntries = parsed[dateKey];
                if (Array.isArray(dateEntries)) {
                    dateEntries.forEach(entry => {
                        if (!entry || !entry.date) return;

                        let entryDate;
                        if (entry.date instanceof Date) {
                            entryDate = entry.date;
                        } else if (typeof entry.date === 'string') {
                            entryDate = new Date(entry.date);
                        } else {
                            entryDate = new Date(entry.date);
                        }

                        // Normalize date to midnight to avoid timezone issues
                        if (!isNaN(entryDate.getTime())) {
                            entryDate = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate());
                            const normalizedDateKey = entryDate.toDateString();

                            if (!formattedEntries[normalizedDateKey]) {
                                formattedEntries[normalizedDateKey] = [];
                            }

                            formattedEntries[normalizedDateKey].push({
                                ...entry,
                                date: entryDate
                            });
                        }
                    });
                }
            });

            return formattedEntries;
        } catch (error) {
            console.error('Error loading from localStorage:', error);
            return {};
        }
    }, []);

    // Initialize DB and load entries
    useEffect(() => {
        let mounted = true;

        const initAndLoad = async () => {
            try {
                setLoading(true);
                await healthDB.init();
                if (!mounted) return;
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
                const formattedEntries = {};
                dbEntries.forEach(entry => {
                    if (!entry || !entry.date) return;

                    let entryDate = entry.date instanceof Date ? entry.date : new Date(entry.date);
                    if (isNaN(entryDate.getTime())) return;

                    entryDate = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate());
                    const dateKey = entryDate.toDateString();

                    if (!formattedEntries[dateKey]) {
                        formattedEntries[dateKey] = [];
                    }

                    const entryPhoto = photosByEntryId[entry.id] || entry.photo;
                    formattedEntries[dateKey].push({
                        ...entry,
                        date: entryDate,
                        photo: entryPhoto || entry.photo
                    });
                });

                if (mounted) {
                    setEntries(formattedEntries);
                    setLoading(false);
                }
            } catch (err) {
                console.error('Error initializing/loading data:', err);
                if (mounted) {
                    // Fallback to localStorage
                    const localEntries = loadFromLocalStorage();
                    setEntries(localEntries);
                    setError(err);
                    setLoading(false);
                }
            }
        };

        initAndLoad();

        return () => {
            mounted = false;
        };
    }, [loadFromLocalStorage]);

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
                    const storageKey = 'healthEntries';
                    const currentData = JSON.parse(localStorage.getItem(storageKey) || '{}');
                    if (!currentData[dateKey]) {
                        currentData[dateKey] = [];
                    }
                    currentData[dateKey].push(entry);
                    localStorage.setItem(storageKey, JSON.stringify(currentData));
                }
            } else {
                // If DB not initialized, save to localStorage
                const storageKey = 'healthEntries';
                const currentData = JSON.parse(localStorage.getItem(storageKey) || '{}');
                if (!currentData[dateKey]) {
                    currentData[dateKey] = [];
                }
                currentData[dateKey].push(entry);
                localStorage.setItem(storageKey, JSON.stringify(currentData));
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
                    const storageKey = 'healthEntries';
                    const currentData = JSON.parse(localStorage.getItem(storageKey) || '{}');
                    if (!currentData[dateKey]) {
                        currentData[dateKey] = [];
                    }
                    const entryIndex = currentData[dateKey].findIndex(e => e.id === entry.id);
                    if (entryIndex >= 0) {
                        currentData[dateKey][entryIndex] = entry;
                    } else {
                        currentData[dateKey].push(entry);
                    }
                    localStorage.setItem(storageKey, JSON.stringify(currentData));
                }
            } else {
                // If DB not initialized, save to localStorage
                const storageKey = 'healthEntries';
                const currentData = JSON.parse(localStorage.getItem(storageKey) || '{}');
                if (!currentData[dateKey]) {
                    currentData[dateKey] = [];
                }
                const entryIndex = currentData[dateKey].findIndex(e => e.id === entry.id);
                if (entryIndex >= 0) {
                    currentData[dateKey][entryIndex] = entry;
                } else {
                    currentData[dateKey].push(entry);
                }
                localStorage.setItem(storageKey, JSON.stringify(currentData));
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
                    const storageKey = 'healthEntries';
                    const currentData = JSON.parse(localStorage.getItem(storageKey) || '{}');
                    if (currentData[dateKey]) {
                        currentData[dateKey] = currentData[dateKey].filter(e => e.id !== entryId);
                        localStorage.setItem(storageKey, JSON.stringify(currentData));
                    }
                }
            } else {
                // If DB not initialized, delete from localStorage
                const storageKey = 'healthEntries';
                const currentData = JSON.parse(localStorage.getItem(storageKey) || '{}');
                if (currentData[dateKey]) {
                    currentData[dateKey] = currentData[dateKey].filter(e => e.id !== entryId);
                    localStorage.setItem(storageKey, JSON.stringify(currentData));
                }
            }
        } catch (err) {
            console.error('Error deleting entry:', err);
            setError(err);
        }
    };

    const refresh = async () => {
        // Re-run load logic
        setLoading(true);
        try {
            const dbEntries = await healthDB.getAllUserEntries();
            // ... (re-use formatting logic, maybe extract it)
            // For brevity, just reloading basic entries for now or triggering re-mount effect
            // A simple way is to just toggle a counter dependency in useEffect, but for now:
            window.location.reload(); // Brute force refresh if needed, or better:
        } catch (e) {
            console.error(e);
        }
    };

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
