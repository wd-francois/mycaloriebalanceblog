import { useState, useRef } from 'react';

const MAX_PHOTO_SIZE_MB = 5;
const MAX_PHOTO_BYTES = MAX_PHOTO_SIZE_MB * 1024 * 1024;

/**
 * Custom hook for managing photo upload, validation, and gallery operations
 * @param {Object} formState - Current form state
 * @param {Function} setFormState - Function to update form state
 * @param {Function} setFormError - Function to set form errors
 * @returns {Object} Photo management functions and state
 */
export function usePhotoManagement(formState, setFormState, setFormError) {
  const [photoSaveMessage, setPhotoSaveMessage] = useState('');
  const [photoSaveError, setPhotoSaveError] = useState('');
  const cameraInputRef = useRef(null);
  const uploadInputRef = useRef(null);

  /**
   * Handle photo selection from camera or file upload
   */
  const handlePhotoSelection = (event, source) => {
    const file = event.target?.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setFormError('Please select an image file.');
      event.target.value = '';
      return;
    }

    // Validate file size
    if (file.size > MAX_PHOTO_BYTES) {
      setFormError(`Please choose an image smaller than ${MAX_PHOTO_SIZE_MB}MB.`);
      event.target.value = '';
      return;
    }

    // Read file as data URL
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (!result) {
        setFormError('Unable to read the selected photo. Please try again.');
        return;
      }

      const generatedId = formState.id || Date.now();
      setFormState(prev => ({
        ...prev,
        photo: {
          dataUrl: result,
          name: file.name,
          size: file.size,
          type: file.type,
          source,
          capturedAt: new Date().toISOString(),
          tempId: generatedId
        }
      }));

      // Clear any previous errors/messages
      setFormError('');
      setPhotoSaveMessage('');
      setPhotoSaveError('');
    };

    reader.onerror = () => {
      setFormError('Unable to read the selected photo. Please try again.');
    };

    reader.readAsDataURL(file);
    event.target.value = '';
  };

  /**
   * Remove the currently attached photo
   */
  const removePhoto = () => {
    setFormState(prev => ({ ...prev, photo: null }));
    setPhotoSaveMessage('');
    setPhotoSaveError('');
  };

  /**
   * Trigger camera capture input
   */
  const triggerCameraCapture = () => {
    cameraInputRef.current?.click();
  };

  /**
   * Trigger file upload input
   */
  const triggerPhotoUpload = () => {
    uploadInputRef.current?.click();
  };

  /**
   * Save photo to gallery as a standalone entry
   */
  const handleSavePhotoToGallery = async (selectedDate, time, activeForm, addEntry) => {
    if (!formState.photo?.dataUrl) {
      setPhotoSaveError('Attach a photo before saving to the gallery.');
      return;
    }

    if (!selectedDate) {
      setPhotoSaveError('Select a date before saving the photo.');
      return;
    }

    // Database is initialized by useHealthData hook before component renders
    // No need to check isDBInitialized here as it causes unnecessary errors


    const entryId = formState.id || formState.photo.tempId || Date.now();
    const normalizedPhoto = {
      ...formState.photo,
      tempId: entryId
    };

    setFormState(prev => ({
      ...prev,
      photo: normalizedPhoto
    }));

    const tempEntry = {
      id: entryId,
      name: formState.name?.trim() || 'Untitled entry',
      type: activeForm,
      date: selectedDate,
      time,
      photo: normalizedPhoto
    };

    try {
      await addEntry(tempEntry);
      setPhotoSaveMessage('Photo saved to gallery.');
      setPhotoSaveError('');
      setTimeout(() => setPhotoSaveMessage(''), 3000);
    } catch (error) {
      console.error('Error saving photo to gallery:', error);
      setPhotoSaveError('Unable to save photo right now. Please try again.');
    }
  };

  return {
    // State
    photoSaveMessage,
    photoSaveError,
    cameraInputRef,
    uploadInputRef,

    // Functions
    handlePhotoSelection,
    removePhoto,
    triggerCameraCapture,
    triggerPhotoUpload,
    handleSavePhotoToGallery
  };
}
