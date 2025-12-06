import { formatTime } from './utils';

/**
 * Export entries to JSON file
 * @param {Object} entries - The entries object
 */
export const exportToJSON = (entries) => {
    try {
        // Create a more readable export format
        const exportData = {
            exportDate: new Date().toISOString(),
            totalDates: Object.keys(entries).length,
            totalEntries: Object.values(entries).reduce((sum, dateEntries) => sum + dateEntries.length, 0),
            entries: entries
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });

        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `health-entries-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Error exporting to JSON:', error);
        alert('Failed to export to JSON. Please try again.');
    }
};

/**
 * Export entries to CSV file
 * @param {Object} entries - The entries object
 * @param {Date} selectedDate - The selected date
 */
export const exportToCSV = (entries, selectedDate) => {
    if (!selectedDate) return;
    try {
        // Get entries for the selected date only
        const dateKey = selectedDate.toDateString();
        const dailyEntries = entries[dateKey] || [];

        if (dailyEntries.length === 0) {
            alert('No entries found for the selected date.');
            return;
        }

        // Create CSV header
        let csvContent = 'Date,Time,Type,Name,Amount,Sets,Reps,Load,Duration,Notes\n';

        // Add entries for the selected date only
        dailyEntries.forEach(entry => {
            const date = new Date(entry.date);
            const formattedDate = date.toLocaleDateString();
            const formattedTime = formatTime(entry.time);
            const name = entry.name.replace(/"/g, '""'); // Escape quotes for CSV
            const amount = entry.amount || '';
            const sets = entry.sets || '';
            const reps = entry.reps || '';
            const load = entry.load || '';
            const duration = entry.duration || '';
            const notes = (entry.notes || '').replace(/"/g, '""'); // Escape quotes for CSV

            csvContent += `"${formattedDate}","${formattedTime}","${entry.type}","${name}","${amount}","${sets}","${reps}","${load}","${duration}","${notes}"\n`;
        });

        const dataBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `daily-entries-${selectedDate.toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Error exporting to CSV:', error);
        alert('Failed to export to CSV. Please try again.');
    }
};

/**
 * Export entries to PDF file
 * @param {Object} entries - The entries object
 */
export const exportToPDF = async (entries) => {
    try {
        // Create PDF content using jsPDF
        const { jsPDF } = await import('jspdf');
        const doc = new jsPDF();

        // Add title
        doc.setFontSize(20);
        doc.text('Health Entries Report', 20, 20);

        // Add export info
        doc.setFontSize(12);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 35);
        doc.text(`Total Dates: ${Object.keys(entries).length}`, 20, 45);
        doc.text(`Total Entries: ${Object.values(entries).reduce((sum, dateEntries) => sum + dateEntries.length, 0)}`, 20, 55);

        // Add entries
        let yPosition = 75;
        doc.setFontSize(14);
        doc.text('Health Entries:', 20, yPosition);
        yPosition += 10;

        Object.keys(entries).forEach(dateKey => {
            const date = new Date(entries[dateKey][0].date);
            const formattedDate = date.toLocaleDateString();

            doc.setFontSize(12);
            doc.setFont(undefined, 'bold');
            doc.text(formattedDate, 20, yPosition);
            yPosition += 8;

            doc.setFont(undefined, 'normal');
            entries[dateKey].forEach(entry => {
                const formattedTime = formatTime(entry.time);
                let entryText = `${formattedTime} - ${entry.type.toUpperCase()}: ${entry.name}`;
                if (entry.amount) entryText += ` (${entry.amount})`;
                if (entry.sets) entryText += ` - ${entry.sets} sets`;
                if (entry.reps) entryText += ` x ${entry.reps} reps`;
                if (entry.load) entryText += ` @ ${entry.load}`;
                if (entry.duration) entryText += ` (${entry.duration})`;
                if (entry.notes) entryText += ` - Notes: ${entry.notes}`;

                // Check if we need a new page
                if (yPosition > 250) {
                    doc.addPage();
                    yPosition = 20;
                }

                doc.text(entryText, 30, yPosition);
                yPosition += 6;
            });

            yPosition += 5;
        });

        // Save the PDF
        doc.save(`health-entries-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
        console.error('Error exporting to PDF:', error);
        alert('Failed to export to PDF. Please try again. Please ensure jsPDF is installed.');
    }
};
