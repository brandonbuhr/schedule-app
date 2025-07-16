"use client";

import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
} from "date-fns";

export default function CalendarView({
  scheduleId,
  onEventClick,
  onDateClick,
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!scheduleId) return;

    const startDate = startOfMonth(currentMonth);
    const endDate = endOfMonth(currentMonth);

    const eventsQuery = query(
      collection(db, "schedules", scheduleId, "events"),
      where("date", ">=", format(startDate, "yyyy-MM-dd")),
      where("date", "<=", format(endDate, "yyyy-MM-dd"))
    );

    const unsubscribe = onSnapshot(
      eventsQuery,
      (snapshot) => {
        const eventsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setEvents(eventsData);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching events:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [scheduleId, currentMonth]);

  const renderHeader = () => {
    return (
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>

        <h2 className="text-xl font-semibold">
          {format(currentMonth, "MMMM yyyy")}
        </h2>

        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>
    );
  };

  const renderDays = () => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return (
      <div className="grid grid-cols-7 mb-2">
        {days.map((day) => (
          <div
            key={day}
            className="text-center text-sm font-medium text-gray-700 py-2"
          >
            {day}
          </div>
        ))}
      </div>
    );
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const dateFormat = "d";
    const rows = [];

    let days = [];
    let day = startDate;
    let formattedDate = "";

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, dateFormat);
        const cloneDay = day;
        const dayEvents = events.filter(
          (event) => event.date === format(cloneDay, "yyyy-MM-dd")
        );

        days.push(
          <div
            key={day}
            className={`
              min-h-[100px] p-2 border border-gray-200
              ${
                !isSameMonth(day, monthStart)
                  ? "bg-gray-50 text-gray-400"
                  : "bg-white"
              }
              ${isSameDay(day, new Date()) ? "bg-blue-50" : ""}
              hover:bg-gray-50 cursor-pointer transition-colors
            `}
            onClick={() => handleDateClick(cloneDay)}
          >
            <div className="font-medium text-sm mb-1">{formattedDate}</div>
            <div className="space-y-1">
              {dayEvents.slice(0, 3).map((event, index) => (
                <div
                  key={event.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onEventClick) onEventClick(event);
                  }}
                  className={`
                    text-xs p-1 rounded truncate
                    ${
                      event.isRecurring
                        ? "bg-blue-100 text-blue-700"
                        : "bg-green-100 text-green-700"
                    }
                    hover:opacity-80 transition-opacity
                  `}
                  title={`${event.title} (${format(
                    new Date(event.startTime),
                    "h:mm a"
                  )} - ${format(new Date(event.endTime), "h:mm a")})`}
                >
                  <span className="font-medium">
                    {format(new Date(event.startTime), "h:mm a")}
                  </span>
                  <span className="ml-1">{event.title}</span>
                </div>
              ))}
              {dayEvents.length > 3 && (
                <div className="text-xs text-gray-500 font-medium">
                  +{dayEvents.length - 3} more
                </div>
              )}
            </div>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div className="grid grid-cols-7" key={day}>
          {days}
        </div>
      );
      days = [];
    }
    return <div>{rows}</div>;
  };

  const handleDateClick = (date) => {
    if (onDateClick) {
      onDateClick(date);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-8">Loading calendar...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {renderHeader()}
      {renderDays()}
      {renderCells()}

      <div className="mt-4 flex items-center gap-4 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-100 rounded"></div>
          <span>Single Event</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-100 rounded"></div>
          <span>Recurring Event</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-50 rounded"></div>
          <span>Today</span>
        </div>
      </div>
    </div>
  );
}
