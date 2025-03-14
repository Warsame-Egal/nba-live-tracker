import { useState, useEffect } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { FaCalendarAlt } from "react-icons/fa";
import { isFuture, isPast, isToday } from "date-fns";

interface CalendarComponentProps {
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
}

const CalendarComponent = ({ selectedDate, setSelectedDate }: CalendarComponentProps) => {
  const [showCalendar, setShowCalendar] = useState(false);

  useEffect(() => {
    if (!selectedDate || isFuture(selectedDate)) {
      // Ensure the selected date defaults to today if it's invalid or in the future
      setSelectedDate(new Date());
    }
  }, [selectedDate, setSelectedDate]);

  const handleDateChange = (date: Date) => {
    if (isPast(date) && !isToday(date)) {
      // If the selected date is in the past, reset to today
      setSelectedDate(new Date());
    } else {
      // Otherwise, set the selected date
      setSelectedDate(date);
    }
    setShowCalendar(false); // Close the calendar
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowCalendar(!showCalendar)}
        className="bg-transparent text-white hover:text-gray-400 flex items-center gap-2"
      >
        <FaCalendarAlt /> Select Date
      </button>

      {showCalendar && (
        <div className="absolute top-12 right-0 bg-neutral-900 p-4 rounded-lg shadow-lg z-10">
          <Calendar
            onChange={(date) => handleDateChange(date as Date)}
            value={selectedDate}
            className="rounded-lg"
            tileDisabled={({ date }) => isFuture(date)} // Disable future dates
          />
        </div>
      )}
    </div>
  );
};

export default CalendarComponent;