import { useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { FaCalendarAlt } from "react-icons/fa";
import { format, isFuture } from "date-fns";

interface CalendarComponentProps {
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
}

const CalendarComponent = ({ selectedDate, setSelectedDate }: CalendarComponentProps) => {
  const [showCalendar, setShowCalendar] = useState(false);

  const handleDateChange = (date: Date) => {
    if (!isFuture(date)) {
      setSelectedDate(date);
    }
    setShowCalendar(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowCalendar(!showCalendar)}
        className="flex items-center gap-2 p-2 rounded-lg hover:bg-neutral-800"
      >
        <FaCalendarAlt className="text-xl" />
        {format(selectedDate, "MMMM dd, yyyy")}
      </button>

      {showCalendar && (
        <div className="absolute mt-2 right-0 md:right-auto md:left-0 bg-neutral-900 p-4 rounded-lg shadow-lg z-10">
          <Calendar
            onChange={(date) => handleDateChange(date as Date)}
            value={selectedDate}
            className="rounded-lg"
            tileDisabled={({ date }) => isFuture(date)}
          />
        </div>
      )}
    </div>
  );
};

export default CalendarComponent;
