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
    const newStart = subDays(currentWeekStart, 7);
    setCurrentWeekStart(newStart);
  };

  const handleNextWeek = () => {
    const newStart = addDays(currentWeekStart, 7);
    setCurrentWeekStart(newStart);
  };

  return (
    <div className="flex items-center justify-between w-full">
      <button onClick={handlePrevWeek} className="hover:text-gray-400">
        <FaChevronLeft size={20} />
      </button>

      <div className="flex justify-center gap-2">
        {Array.from({ length: 7 }).map((_, i) => {
          const day = addDays(currentWeekStart, i);
          const formattedDay = format(day, "yyyy-MM-dd");
          const isSelected = formattedDay === selectedDate;
          const isToday = isSameDay(day, new Date());

          return (
            <button
              key={formattedDay}
              onClick={() => setSelectedDate(formattedDay)}
              className={`text-center px-3 py-1 rounded-lg ${
                isSelected
                  ? "border-b-2 border-blue-500 font-bold"
                  : "hover:text-gray-400"
              } ${isToday ? "text-blue-500" : ""}`}
            >
              <div>{format(day, "EEE")}</div>
              <div>{format(day, "d")}</div>
            </button>
          );
        })}
      </div>

      <div className="hover:text-gray-400 flex gap-2">
        <button onClick={handlePrevWeek}>
          <FaChevronLeft size={20} />
        </button>
        <button onClick={handleNextWeek}>
          <FaChevronRight size={20} />
        </button>
      </div>
    </div>
  );
};

export default WeeklyCalendar;
