import { useState, useEffect } from 'react';

const MeasurementsForm = ({ onSubmit, onCancel, initialData = null, settings = { weightUnit: 'kg', lengthUnit: 'cm' } }) => {
  const [formData, setFormData] = useState({
    weight: initialData?.weight || '',
    neck: initialData?.neck || '',
    shoulders: initialData?.shoulders || '',
    chest: initialData?.chest || '',
    waist: initialData?.waist || '',
    hips: initialData?.hips || '',
    thigh: initialData?.thigh || '',
    arm: initialData?.arm || '',
    // Skinfold measurements
    chestSkinfold: initialData?.chestSkinfold || '',
    abdominalSkinfold: initialData?.abdominalSkinfold || '',
    thighSkinfold: initialData?.thighSkinfold || '',
    tricepSkinfold: initialData?.tricepSkinfold || '',
    subscapularSkinfold: initialData?.subscapularSkinfold || '',
    suprailiacSkinfold: initialData?.suprailiacSkinfold || '',
    notes: initialData?.notes || ''
  });

  const [errors, setErrors] = useState({});
  const [openSections, setOpenSections] = useState({
    weight: true,
    girth: false,
    skinfolds: false
  });

  // Update form data when initialData changes (for editing)
  useEffect(() => {
    if (initialData) {
      setFormData({
        weight: initialData.weight || '',
        neck: initialData.neck || '',
        shoulders: initialData.shoulders || '',
        chest: initialData.chest || '',
        waist: initialData.waist || '',
        hips: initialData.hips || '',
        thigh: initialData.thigh || '',
        arm: initialData.arm || '',
        chestSkinfold: initialData.chestSkinfold || '',
        abdominalSkinfold: initialData.abdominalSkinfold || '',
        thighSkinfold: initialData.thighSkinfold || '',
        tricepSkinfold: initialData.tricepSkinfold || '',
        subscapularSkinfold: initialData.subscapularSkinfold || '',
        suprailiacSkinfold: initialData.suprailiacSkinfold || '',
        notes: initialData.notes || ''
      });
    }
  }, [initialData]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const toggleSection = (section) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    // Weight is required
    if (!formData.weight.trim()) {
      newErrors.weight = 'Weight is required';
    } else if (isNaN(parseFloat(formData.weight)) || parseFloat(formData.weight) <= 0) {
      newErrors.weight = 'Please enter a valid weight';
    }

    // Validate numeric fields (optional but must be valid if provided)
    const numericFields = ['neck', 'shoulders', 'chest', 'waist', 'hips', 'thigh', 'arm', 'chestSkinfold', 'abdominalSkinfold', 'thighSkinfold', 'tricepSkinfold', 'subscapularSkinfold', 'suprailiacSkinfold'];
    numericFields.forEach(field => {
      if (formData[field].trim() && (isNaN(parseFloat(formData[field])) || parseFloat(formData[field]) <= 0)) {
        newErrors[field] = 'Please enter a valid measurement';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (validateForm()) {
      // Convert string values to numbers where appropriate
      const submissionData = {
        ...formData,
        weight: parseFloat(formData.weight),
        neck: formData.neck ? parseFloat(formData.neck) : null,
        shoulders: formData.shoulders ? parseFloat(formData.shoulders) : null,
        chest: formData.chest ? parseFloat(formData.chest) : null,
        waist: formData.waist ? parseFloat(formData.waist) : null,
        hips: formData.hips ? parseFloat(formData.hips) : null,
        thigh: formData.thigh ? parseFloat(formData.thigh) : null,
        arm: formData.arm ? parseFloat(formData.arm) : null,
        // Skinfold measurements
        chestSkinfold: formData.chestSkinfold ? parseFloat(formData.chestSkinfold) : null,
        abdominalSkinfold: formData.abdominalSkinfold ? parseFloat(formData.abdominalSkinfold) : null,
        thighSkinfold: formData.thighSkinfold ? parseFloat(formData.thighSkinfold) : null,
        tricepSkinfold: formData.tricepSkinfold ? parseFloat(formData.tricepSkinfold) : null,
        subscapularSkinfold: formData.subscapularSkinfold ? parseFloat(formData.subscapularSkinfold) : null,
        suprailiacSkinfold: formData.suprailiacSkinfold ? parseFloat(formData.suprailiacSkinfold) : null,
        id: initialData?.id || null
      };

      onSubmit(submissionData);
    }
  };

  const weightFields = [
    { key: 'weight', label: 'Weight', required: true, unit: settings.weightUnit }
  ];

  const girthFields = [
    { key: 'neck', label: 'Neck', required: false, unit: settings.lengthUnit },
    { key: 'shoulders', label: 'Shoulders', required: false, unit: settings.lengthUnit },
    { key: 'chest', label: 'Chest', required: false, unit: settings.lengthUnit },
    { key: 'waist', label: 'Waist', required: false, unit: settings.lengthUnit },
    { key: 'hips', label: 'Hips', required: false, unit: settings.lengthUnit },
    { key: 'thigh', label: 'Thigh', required: false, unit: settings.lengthUnit },
    { key: 'arm', label: 'Arm', required: false, unit: settings.lengthUnit }
  ];

  const skinfoldFields = [
    { key: 'chestSkinfold', label: 'Chest Skinfold', required: false, unit: 'mm' },
    { key: 'abdominalSkinfold', label: 'Abdominal Skinfold', required: false, unit: 'mm' },
    { key: 'thighSkinfold', label: 'Thigh Skinfold', required: false, unit: 'mm' },
    { key: 'tricepSkinfold', label: 'Tricep Skinfold', required: false, unit: 'mm' },
    { key: 'subscapularSkinfold', label: 'Subscapular Skinfold', required: false, unit: 'mm' },
    { key: 'suprailiacSkinfold', label: 'Suprailiac Skinfold', required: false, unit: 'mm' }
  ];

  const renderField = (field) => (
    <div key={field.key}>
      <label htmlFor={field.key} className="block text-sm font-medium text-gray-700 mb-1">
        {field.label} {field.required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <input
          id={field.key}
          type="number"
          step="0.1"
          min="0"
          value={formData[field.key]}
          onChange={(e) => handleInputChange(field.key, e.target.value)}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors[field.key] ? 'border-red-500' : 'border-gray-300'
            }`}
          placeholder={`Enter ${field.label.toLowerCase()}`}
        />
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <span className="text-gray-500 text-sm">{field.unit}</span>
        </div>
      </div>
      {errors[field.key] && (
        <p className="mt-1 text-sm text-red-600">{errors[field.key]}</p>
      )}
    </div>
  );

  const renderAccordionSection = (sectionKey, title, fields) => (
    <div className="border border-gray-200 rounded-lg mb-4">
      <button
        type="button"
        onClick={() => toggleSection(sectionKey)}
        className="w-full px-4 py-3 text-left bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset rounded-t-lg"
      >
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-medium text-gray-900">{title}</h4>
          <svg
            className={`w-5 h-5 text-gray-500 transform transition-transform ${openSections[sectionKey] ? 'rotate-180' : ''
              }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      {openSections[sectionKey] && (
        <div className="p-3 sm:p-4 bg-white">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {fields.map(renderField)}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
          {initialData ? 'Edit Measurements' : 'Add Measurements'}
        </h3>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600 transition-colors p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="space-y-4">
        {renderAccordionSection('weight', 'Weight', weightFields)}
        {renderAccordionSection('girth', 'Girth Measurements', girthFields)}
        {renderAccordionSection('skinfolds', 'Skinfolds', skinfoldFields)}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes (Optional)
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Add any additional notes about your measurements..."
          />
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-3 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors min-h-[44px]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-4 py-3 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors min-h-[44px]"
          >
            {initialData ? 'Update Measurements' : 'Save Measurements'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MeasurementsForm;

