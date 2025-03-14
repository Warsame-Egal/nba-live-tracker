import { useState, useEffect } from "react";
import { format, addDays, subDays, startOfWeek } from "date-fns";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

interface WeeklyCalendarProps {
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
}

const WeeklyCalendar = ({ selectedDate, setSelectedDate }: WeeklyCalendarProps) => {
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(
    startOfWeek(new Date(), { weekStartsOn: 0 }) // Start of the week is Sunday
  );

  // Set today's date as the default if no date is selected
  useEffect(() => {
    if (!selectedDate) {
      setSelectedDate(new Date()); // Default to today's date if no date is selected
    }
  }, [selectedDate, setSelectedDate]);

  const handlePrevWeek = () => {
    setCurrentWeekStart(subDays(currentWeekStart, 7));
  };

  const handleNextWeek = () => {
    setCurrentWeekStart(addDays(currentWeekStart, 7));
  };

  return (
    <div className="flex items-center justify-between w-full">
      {/* Previous Week Button */}
      <button
        onClick={handlePrevWeek}
        className="hover:text-gray-400"
      >
        <FaChevronLeft size={20} />
      </button>

      {/* Weekly Calendar Display */}
      <div className="flex justify-between w-full px-4">
        {Array.from({ length: 7 }).map((_, i) => {
          const day = addDays(currentWeekStart, i); // Get each day of the week
          const isToday = format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd"); // Check if it's today
          const isSelected = format(day, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd"); // Check if it's selected

          return (
            <button
              key={i}
              className={`text-center px-3 py-1 rounded-lg ${
                isSelected
                  ? "border-b-2 border-blue-500 font-bold"
                  : "hover:text-gray-300"
              } ${isToday && !selectedDate ? "bg-blue-500 text-white" : ""}`}
              onClick={() => setSelectedDate(day)} // Set selected date when clicked
            >
              <p className="text-xs">{format(day, "EEE")}</p>
              <p className="text-sm">{format(day, "d")}</p>
            </button>
          );
        })}
      </div>

      {/* Next Week Button */}
      <button
        onClick={handleNextWeek}
        className="hover:text-gray-400"
      >
        <FaChevronRight size={20} />
      </button>
    </div>
  );
};

export default WeeklyCalendar;
