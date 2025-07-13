"use client";

import { useState, useEffect } from "react";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  deleteDoc,
  doc,
  writeBatch,
  getDocs,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import toast from "react-hot-toast";

export default function EventList({ scheduleId, userRole }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [groupedEvents, setGroupedEvents] = useState({});
  const { user } = useAuth();

  useEffect(() => {
    if (!scheduleId) return;

    const eventsQuery = query(
      collection(db, "schedules", scheduleId, "events"),
      orderBy("startTime", "asc")
    );

    const unsubscribe = onSnapshot(
      eventsQuery,
      (snapshot) => {
        const eventsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        const grouped = eventsData.reduce((acc, event) => {
          const date = event.date;
          if (!acc[date]) {
            acc[date] = [];
          }
          acc[date].push(event);
          return acc;
        }, {});

        setEvents(eventsData);
        setGroupedEvents(grouped);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching events:", error);
        toast.error("Failed to load events");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [scheduleId]);

  const handleDeleteEvent = async (event) => {
    const confirmMessage = event.isRecurring
      ? "Do you want to delete just this event or all recurring events in this series?"
      : "Are you sure you want to delete this event?";

    if (event.isRecurring) {
      const choice = window.confirm(
        confirmMessage +
          "\n\nOK = Delete all in series\nCancel = Delete only this event"
      );

      try {
        if (choice) {
          const batch = writeBatch(db);
          const recurringQuery = query(
            collection(db, "schedules", scheduleId, "events"),
            where("recurringGroupId", "==", event.recurringGroupId)
          );
          const recurringDocs = await getDocs(recurringQuery);

          recurringDocs.forEach((doc) => {
            batch.delete(doc.ref);
          });

          await batch.commit();
          toast.success(`Deleted ${recurringDocs.size} recurring events`);
        } else {
          await deleteDoc(doc(db, "schedules", scheduleId, "events", event.id));
          toast.success("Event deleted successfully");
        }
      } catch (error) {
        console.error("Error deleting event:", error);
        toast.error("Failed to delete event");
      }
    } else {
      if (window.confirm(confirmMessage)) {
        try {
          await deleteDoc(doc(db, "schedules", scheduleId, "events", event.id));
          toast.success("Event deleted successfully");
        } catch (error) {
          console.error("Error deleting event:", error);
          toast.error("Failed to delete event");
        }
      }
    }
  };

  const formatTime = (isoString) => {
    return new Date(isoString).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.getTime() === today.getTime()) {
      return "Today";
    } else if (date.getTime() === tomorrow.getTime()) {
      return "Tomorrow";
    } else {
      return date.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year:
          date.getFullYear() !== new Date().getFullYear()
            ? "numeric"
            : undefined,
      });
    }
  };

  const canEdit = userRole === "admin" || userRole === "editor";

  if (loading) {
    return <div className="text-center py-4">Loading events...</div>;
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No events scheduled yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-h-96 overflow-y-auto">
      {Object.entries(groupedEvents)
        .sort(([dateA], [dateB]) => new Date(dateA) - new Date(dateB))
        .map(([date, dateEvents]) => {
          const dateObj = new Date(date + "T00:00:00");
          const isPast = dateObj < new Date().setHours(0, 0, 0, 0);

          return (
            <div key={date} className={isPast ? "opacity-60" : ""}>
              <h3 className="text-lg font-semibold mb-3 text-gray-900 sticky top-0 bg-white py-2">
                {formatDate(date)}
                {isPast && (
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    (Past)
                  </span>
                )}
              </h3>
              <div className="space-y-2">
                {dateEvents.map((event) => (
                  <div
                    key={event.id}
                    className="bg-gray-50 border rounded-lg p-4 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-gray-900">
                            {event.title}
                          </h4>
                          {event.isRecurring && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                              Recurring
                            </span>
                          )}
                        </div>
                        {event.description && (
                          <p className="text-sm text-gray-600 mt-1">
                            {event.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                          <span className="font-medium">
                            {formatTime(event.startTime)} -{" "}
                            {formatTime(event.endTime)}
                          </span>
                          <span>by {event.createdByName}</span>
                        </div>
                      </div>
                      {canEdit && event.createdBy === user.uid && !isPast && (
                        <button
                          onClick={() => handleDeleteEvent(event)}
                          className="text-red-500 hover:text-red-700 text-sm ml-4"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
    </div>
  );
}
