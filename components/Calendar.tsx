import React from 'react';

const Calendar: React.FC = () => {
    return (
        <div className="bg-white p-6 rounded-lg shadow-md mt-8">
            <h2 className="text-xl font-bold text-gray-700 mb-4">Kalendář rezervací</h2>
            <div className="border border-dashed border-gray-300 rounded-md p-10 text-center text-gray-500">
                <p>Zobrazení kalendáře je ve vývoji.</p>
                <p className="text-sm mt-2">A full calendar implementation would go here (e.g., using FullCalendar.io or a custom grid).</p>
            </div>
        </div>
    );
};

export default Calendar;
