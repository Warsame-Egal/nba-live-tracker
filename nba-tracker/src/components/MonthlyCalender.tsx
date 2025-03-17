import { useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { FaCalendarAlt } from "react-icons/fa";
import { format, isSameDay } from "date-fns";

interface MonthlyComponentProps {
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
}

const CalendarComponent = ({ selectedDate, setSelectedDate }: MonthlyComponentProps) => {
  const [showCalendar, setShowCalendar] = useState(false);

  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
    setShowCalendar(false);
  };

  return (
    <div className="relative">
      {/* Button to Open Calendar */}
      <button
        onClick={() => setShowCalendar(!showCalendar)}
        className="flex items-center gap-3 px-4 py-2 rounded-lg text-white hover:bg-blue-600 transition-all duration-300"
      >
        <FaCalendarAlt className="text-xl" />
        <span className="text-sm font-semibold">{format(selectedDate, "MMMM dd, yyyy")}</span>
      </button>

      {/* Calendar Popover */}
      {showCalendar && (
        <div className="absolute mt-3 right-0 md:right-auto md:left-0 bg-neutral-900 p-4 rounded-xl shadow-2xl 
        backdrop-blur-md bg-opacity-90 border border-neutral-700 z-20 min-w-[250px] max-w-sm">
          <Calendar
            onChange={(date) => handleDateChange(date as Date)}
            value={selectedDate}
            className="rounded-lg shadow-md"
            tileClassName={({ date }) =>
              isSameDay(date, selectedDate) ? "bg-blue-500 text-white font-bold rounded-full" : ""
            }
          />
        </div>
      )}
    </div>
  );
};

export default CalendarComponent;
