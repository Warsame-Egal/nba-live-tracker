import { useState, useEffect } from "react";
import { format, addDays, subDays, startOfWeek, isSameDay } from "date-fns";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

interface WeeklyCalendarProps {
  selectedDate: string;
  setSelectedDate: (date: string) => void;
}

const WeeklyCalendar = ({ selectedDate, setSelectedDate }: WeeklyCalendarProps) => {
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(
    startOfWeek(new Date(), { weekStartsOn: 0 })
  );

  useEffect(() => {
    if (!selectedDate) {
      setSelectedDate(format(new Date(), "yyyy-MM-dd"));
    }
  }, [selectedDate, setSelectedDate]);

  const handlePrevWeek = () => {
    setCurrentWeekStart(subDays(currentWeekStart, 7));
  };

  const handleNextWeek = () => {
    setCurrentWeekStart(addDays(currentWeekStart, 7));
  };

  return (
    <div className="flex flex-col items-center w-full">
      {/* Navigation */}
      <div className="flex items-center gap-4 mb-3">
        <button
          onClick={handlePrevWeek}
          className="p-2 rounded-full bg-neutral-800 hover:bg-blue-500 transition-all duration-300"
          aria-label="Previous Week"
        >
          <FaChevronLeft className="text-white" size={18} />
        </button>

        <h2 className="text-lg font-bold text-white">
          {format(currentWeekStart, "MMMM yyyy")}
        </h2>

        <button
          onClick={handleNextWeek}
          className="p-2 rounded-full bg-neutral-800 hover:bg-blue-500 transition-all duration-300"
          aria-label="Next Week"
        >
          <FaChevronRight className="text-white" size={18} />
        </button>
      </div>

      {/* Weekly Days Grid */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(40px,1fr))] gap-3 w-full max-w-lg bg-gradient-to-r from-neutral-800 to-neutral-900 p-4 rounded-xl shadow-md">
        {Array.from({ length: 7 }).map((_, i) => {
          const day = addDays(currentWeekStart, i);
          const formattedDay = format(day, "yyyy-MM-dd");
          const isSelected = formattedDay === selectedDate;
          const isToday = isSameDay(day, new Date());

          return (
            <button
              key={formattedDay}
              onClick={() => setSelectedDate(formattedDay)}
              className={`flex flex-col items-center justify-center p-2 w-full rounded-lg transition-all duration-300
                ${isSelected ? "bg-blue-500 text-white font-bold scale-105" : "hover:bg-gray-700"}
                ${isToday ? "border-b-4 border-blue-400 text-blue-400" : ""}`}
              aria-label={`Select ${format(day, "EEEE, MMMM d")}`}
            >
              <span className="text-sm">{format(day, "EEE")}</span>
              <span className="text-lg font-semibold">{format(day, "d")}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default WeeklyCalendar;
