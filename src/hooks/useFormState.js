import { useState } from 'react';
import { calculateSleepDuration } from '../lib/dateUtils';

const INITIAL_FORM_STATE = {
    id: null,
    name: '',
    type: 'meal',
    sets: [],
    amount: '',
    calories: '',
    protein: '',
    carbs: '',
    fats: '',
    fibre: '',
    other: '',
    bedtime: { hour: 10, minute: 0, period: 'PM' },
    waketime: { hour: 6, minute: 0, period: 'AM' },
    weight: '',
    neck: '',
    shoulders: '',
    chest: '',
    waist: '',
    hips: '',
    thigh: '',
    arm: '',
    calf: '',
    chestSkinfold: '',
    abdominalSkinfold: '',
    thighSkinfold: '',
    tricepSkinfold: '',
    subscapularSkinfold: '',
    suprailiacSkinfold: '',
    notes: '',
    photo: null
};

/**
 * Custom hook for managing form state, validation, and submission
 * @param {Function} addEntry - Function to add a new entry
 * @param {Function} updateEntry - Function to update an existing entry
 * @param {Function} addToLibrary - Function to add entry to library
 * @returns {Object} Form state and handlers
 */
export function useFormState(addEntry, updateEntry, addToLibrary) {
    const [formState, setFormState] = useState(INITIAL_FORM_STATE);
    const [formError, setFormError] = useState('');
    const [formSuccessMessage, setFormSuccessMessage] = useState('');
    const [activeForm, setActiveForm] = useState('meal');

    /**
     * Reset form to initial state
     */
    const resetForm = (setShowMealInput, setShowExerciseInput, setShowSleepInput, setShowMeasurementsInput) => {
        setFormState(INITIAL_FORM_STATE);
        setFormError('');

        // Hide all forms after successful submission
        if (setShowMealInput) setShowMealInput(false);
        if (setShowExerciseInput) setShowExerciseInput(false);
        if (setShowSleepInput) setShowSleepInput(false);
        if (setShowMeasurementsInput) setShowMeasurementsInput(false);

        // Show success message
        setFormSuccessMessage('Entry saved successfully! Form cleared for next entry.');
        setTimeout(() => {
            setFormSuccessMessage('');
        }, 3000);
    };

    /**
     * Validate form data based on active form type
     */
    const validateForm = (data, activeFormType) => {
        const name = activeFormType === 'measurements' ? 'Body Measurements' :
            activeFormType === 'sleep' ? 'Sleep' : data.name.trim();

        // Validate meal entries
        if (!name && activeFormType === 'meal') {
            setFormError('Meal name is required.');
            return false;
        }

        // Validate measurements
        if (activeFormType === 'measurements') {
            if (!data.weight || !data.weight.toString().trim()) {
                setFormError('Weight is required for measurements.');
                return false;
            }
            if (isNaN(parseFloat(data.weight)) || parseFloat(data.weight) <= 0) {
                setFormError('Please enter a valid weight.');
                return false;
            }
        }

        return true;
    };

    /**
     * Build entry object from form data
     */
    const buildEntry = (data, activeFormType, time, selectedDate) => {
        const name = activeFormType === 'measurements' ? 'Body Measurements' :
            activeFormType === 'sleep' ? 'Sleep' : data.name.trim();

        // Normalize date
        const normalizedDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
        if (isNaN(normalizedDate.getTime())) {
            throw new Error('Invalid date');
        }

        const generatedId = data.id || data.photo?.tempId || Date.now();

        return {
            id: generatedId,
            name,
            type: activeFormType,
            date: normalizedDate,
            time,
            ...(activeFormType === 'exercise' && { sets: data.sets }),
            ...(activeFormType === 'meal' && {
                amount: data.amount,
                calories: data.calories,
                protein: data.protein,
                carbs: data.carbs,
                fats: data.fats,
                fibre: data.fibre,
                other: data.other
            }),
            ...(activeFormType === 'sleep' && {
                bedtime: data.bedtime,
                waketime: data.waketime,
                duration: calculateSleepDuration(data.bedtime, data.waketime)
            }),
            ...(activeFormType === 'measurements' && {
                weight: parseFloat(data.weight),
                neck: data.neck ? parseFloat(data.neck) : null,
                shoulders: data.shoulders ? parseFloat(data.shoulders) : null,
                chest: data.chest ? parseFloat(data.chest) : null,
                waist: data.waist ? parseFloat(data.waist) : null,
                hips: data.hips ? parseFloat(data.hips) : null,
                thigh: data.thigh ? parseFloat(data.thigh) : null,
                arm: data.arm ? parseFloat(data.arm) : null,
                calf: data.calf ? parseFloat(data.calf) : null,
                chestSkinfold: data.chestSkinfold ? parseFloat(data.chestSkinfold) : null,
                abdominalSkinfold: data.abdominalSkinfold ? parseFloat(data.abdominalSkinfold) : null,
                thighSkinfold: data.thighSkinfold ? parseFloat(data.thighSkinfold) : null,
                tricepSkinfold: data.tricepSkinfold ? parseFloat(data.tricepSkinfold) : null,
                subscapularSkinfold: data.subscapularSkinfold ? parseFloat(data.subscapularSkinfold) : null,
                suprailiacSkinfold: data.suprailiacSkinfold ? parseFloat(data.suprailiacSkinfold) : null,
                notes: data.notes
            }),
            ...(data.photo ? { photo: data.photo } : {})
        };
    };

    /**
     * Handle form submission
     */
    const handleSubmitWithData = async (data, time, selectedDate, activeFormType, callbacks) => {
        console.log('handleSubmitWithData called with:', { data, time, selectedDate, activeFormType });
        setFormError('');

        if (!selectedDate) {
            console.error('Cannot save entry: selectedDate is null or undefined');
            setFormError('Please select a date before saving.');
            return;
        }

        // Validate form
        if (!validateForm(data, activeFormType)) {
            console.error('Form validation failed');
            return;
        }

        try {
            // Build entry
            const entry = buildEntry(data, activeFormType, time, selectedDate);
            console.log('Built entry:', entry);

            // Save entry
            if (data.id == null) {
                console.log('Adding new entry...');
                await addEntry(entry);
                // Auto-add to library for new meals and exercises
                if (activeFormType === 'meal' || activeFormType === 'exercise') {
                    addToLibrary(entry);
                }
            } else {
                console.log('Updating existing entry...');
                await updateEntry(entry);
            }

            console.log('Entry saved successfully!');
            // Reset form and call success callbacks
            resetForm(
                callbacks?.setShowMealInput,
                callbacks?.setShowExerciseInput,
                callbacks?.setShowSleepInput,
                callbacks?.setShowMeasurementsInput
            );
        } catch (error) {
            console.error('Error saving entry:', error);
            setFormError('Failed to save entry. Please try again.');
        }
    };

    /**
     * Handle form submission event
     */
    const handleSubmit = (e, time, selectedDate, callbacks) => {
        if (e && e.preventDefault) {
            e.preventDefault();
        }
        handleSubmitWithData(formState, time, selectedDate, activeForm, callbacks);
    };

    /**
     * Load entry data into form for editing
     */
    const loadEntryForEdit = (entry, setTime, setShowModal, setShowMealInput, setShowExerciseInput, setShowSleepInput, setShowMeasurementsInput) => {
        setShowModal(true);

        if (entry.time) {
            setTime(entry.time);
        }

        setFormState({
            id: entry.id,
            name: entry.name,
            type: entry.type,
            sets: entry.sets || [],
            amount: entry.amount || '',
            calories: entry.calories || '',
            protein: entry.protein || '',
            carbs: entry.carbs || '',
            fats: entry.fats || '',
            bedtime: entry.bedtime || { hour: 10, minute: 0, period: 'PM' },
            waketime: entry.waketime || { hour: 6, minute: 0, period: 'AM' },
            duration: entry.duration || '',
            intensity: entry.intensity || '',
            quality: entry.quality || '',
            weight: entry.weight || '',
            neck: entry.neck || '',
            shoulders: entry.shoulders || '',
            chest: entry.chest || '',
            waist: entry.waist || '',
            hips: entry.hips || '',
            thigh: entry.thigh || '',
            arm: entry.arm || '',
            calf: entry.calf || '',
            chestSkinfold: entry.chestSkinfold || '',
            abdominalSkinfold: entry.abdominalSkinfold || '',
            thighSkinfold: entry.thighSkinfold || '',
            tricepSkinfold: entry.tricepSkinfold || '',
            subscapularSkinfold: entry.subscapularSkinfold || '',
            suprailiacSkinfold: entry.suprailiacSkinfold || '',
            notes: entry.notes || '',
            photo: entry.photo || null
        });

        setActiveForm(entry.type);

        // Show the appropriate form input
        if (entry.type === 'meal') {
            setShowMealInput(true);
        } else if (entry.type === 'exercise') {
            setShowExerciseInput(true);
        } else if (entry.type === 'sleep') {
            setShowSleepInput(true);
        } else if (entry.type === 'measurements') {
            setShowMeasurementsInput(true);
        }
    };

    return {
        // State
        formState,
        setFormState,
        formError,
        setFormError,
        formSuccessMessage,
        setFormSuccessMessage,
        activeForm,
        setActiveForm,

        // Functions
        resetForm,
        handleSubmit,
        handleSubmitWithData,
        loadEntryForEdit
    };
}
