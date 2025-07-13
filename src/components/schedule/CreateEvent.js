"use client";

import { useState } from "react";
import { collection, addDoc, writeBatch, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import toast from "react-hot-toast";

export default function CreateEvent({ scheduleId, onSuccess }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringType, setRecurringType] = useState("daily");
  const [recurringEnd, setRecurringEnd] = useState("");
  const [selectedDays, setSelectedDays] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const daysOfWeek = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  const handleDayToggle = (dayIndex) => {
    setSelectedDays((prev) =>
      prev.includes(dayIndex)
        ? prev.filter((d) => d !== dayIndex)
        : [...prev, dayIndex]
    );
  };

  const generateRecurringDates = (startDate, endDate, type, selectedDays) => {
    const dates = [];
    const current = new Date(startDate);
    const end = new Date(endDate);

    while (current <= end) {
      if (type === "daily") {
        dates.push(new Date(current));
        current.setDate(current.getDate() + 1);
      } else if (type === "weekly") {
        dates.push(new Date(current));
        current.setDate(current.getDate() + 7);
      } else if (type === "weekdays") {
        const dayOfWeek = current.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          dates.push(new Date(current));
        }
        current.setDate(current.getDate() + 1);
      } else if (type === "custom") {
        const dayOfWeek = current.getDay();
        if (selectedDays.includes(dayOfWeek)) {
          dates.push(new Date(current));
        }
        current.setDate(current.getDate() + 1);
      }
    }

    return dates;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const startDateTime = new Date(`${date}T${startTime}`);
      const endDateTime = new Date(`${date}T${endTime}`);

      if (endDateTime <= startDateTime) {
        toast.error("End time must be after start time");
        setLoading(false);
        return;
      }

      if (
        isRecurring &&
        recurringType === "custom" &&
        selectedDays.length === 0
      ) {
        toast.error(
          "Please select at least one day for custom recurring events"
        );
        setLoading(false);
        return;
      }

      const baseEventData = {
        title,
        description,
        createdBy: user.uid,
        createdByName: user.displayName || user.email,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (!isRecurring) {
        const eventData = {
          ...baseEventData,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          date: date,
          isRecurring: false,
        };

        await addDoc(
          collection(db, "schedules", scheduleId, "events"),
          eventData
        );
        toast.success("Event created successfully!");
      } else {
        const dates = generateRecurringDates(
          date,
          recurringEnd,
          recurringType,
          selectedDays
        );

        if (dates.length === 0) {
          toast.error("No events to create with selected criteria");
          setLoading(false);
          return;
        }

        if (dates.length > 100) {
          toast.error(
            "Too many recurring events (max 100). Please reduce the date range."
          );
          setLoading(false);
          return;
        }

        const batch = writeBatch(db);
        const recurringGroupId = `recurring_${Date.now()}`;

        dates.forEach((eventDate) => {
          const eventStartTime = new Date(eventDate);
          eventStartTime.setHours(
            startDateTime.getHours(),
            startDateTime.getMinutes()
          );

          const eventEndTime = new Date(eventDate);
          eventEndTime.setHours(
            endDateTime.getHours(),
            endDateTime.getMinutes()
          );

          const eventData = {
            ...baseEventData,
            startTime: eventStartTime.toISOString(),
            endTime: eventEndTime.toISOString(),
            date: eventDate.toISOString().split("T")[0],
            isRecurring: true,
            recurringGroupId,
            recurringType,
          };

          const docRef = doc(collection(db, "schedules", scheduleId, "events"));
          batch.set(docRef, eventData);
        });

        await batch.commit();
        toast.success(`Created ${dates.length} recurring events!`);
      }

      setTitle("");
      setDescription("");
      setDate("");
      setStartTime("");
      setEndTime("");
      setIsRecurring(false);
      setRecurringEnd("");
      setSelectedDays([]);

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error creating event:", error);
      toast.error("Failed to create event");
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().toISOString().split("T")[0];
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() + 1);
  const maxDateString = maxDate.toISOString().split("T")[0];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="title"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Event Title
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g., Morning Shift"
          required
        />
      </div>

      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Description (optional)
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Add any details about this shift..."
          rows={2}
        />
      </div>

      <div>
        <label
          htmlFor="date"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {isRecurring ? "Start Date" : "Date"}
        </label>
        <input
          id="date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          min={today}
          max={maxDateString}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="startTime"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Start Time
          </label>
          <input
            id="startTime"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label
            htmlFor="endTime"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            End Time
          </label>
          <input
            id="endTime"
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
      </div>

      <div className="space-y-4 border-t pt-4">
        <div className="flex items-center">
          <input
            id="isRecurring"
            type="checkbox"
            checked={isRecurring}
            onChange={(e) => setIsRecurring(e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label
            htmlFor="isRecurring"
            className="ml-2 block text-sm text-gray-700"
          >
            Make this a recurring event
          </label>
        </div>

        {isRecurring && (
          <>
            <div>
              <label
                htmlFor="recurringType"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Repeat Pattern
              </label>
              <select
                id="recurringType"
                value={recurringType}
                onChange={(e) => setRecurringType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly (same day)</option>
                <option value="weekdays">Weekdays Only (Mon-Fri)</option>
                <option value="custom">Custom Days</option>
              </select>
            </div>

            {recurringType === "custom" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Days
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {daysOfWeek.map((day, index) => (
                    <label key={day} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedDays.includes(index)}
                        onChange={() => handleDayToggle(index)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">{day}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label
                htmlFor="recurringEnd"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                End Date
              </label>
              <input
                id="recurringEnd"
                type="date"
                value={recurringEnd}
                onChange={(e) => setRecurringEnd(e.target.value)}
                min={date || today}
                max={maxDateString}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required={isRecurring}
              />
            </div>
          </>
        )}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading
          ? "Creating..."
          : isRecurring
          ? "Create Recurring Events"
          : "Create Event"}
      </button>
    </form>
  );
}
