

/**
 * Modal for adding/editing notes on an entry
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {Object} props.selectedEntry - The entry being edited
 * @param {Object} props.infoFormData - Form data for notes
 * @param {Function} props.setInfoFormData - Function to update form data
 * @param {Function} props.onSave - Function to save the information
 * @param {Function} props.onCancel - Function to cancel and close modal
 */
export default function InfoModal({
    isOpen,
    selectedEntry,
    infoFormData,
    setInfoFormData,
    onSave,
    onCancel
}) {
    if (!isOpen || !selectedEntry) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ overflow: 'hidden' }}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
            <div className="relative w-full max-w-md bg-white rounded-xl shadow-xl mx-4 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">
                            Add Information - {selectedEntry.name}
                        </h3>
                        <button
                            onClick={onCancel}
                            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Form */}
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Notes
                        </label>
                        <textarea
                            value={infoFormData.notes}
                            onChange={(e) => setInfoFormData(prev => ({ ...prev, notes: e.target.value }))}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            rows={3}
                            placeholder="Add any additional notes about this entry..."
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4">
                        <button
                            onClick={onSave}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Save Information
                        </button>
                        <button
                            onClick={onCancel}
                            className="flex-1 px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
