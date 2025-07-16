"use client";

import { useState, useEffect, use } from "react";
import {
  doc,
  getDoc,
  collection,
  onSnapshot,
  deleteDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import AddMember from "@/components/schedule/AddMember";
import CreateEvent from "@/components/schedule/CreateEvent";
import EventList from "@/components/schedule/EventList";
import CalendarView from "@/components/schedule/CalenderView";
import EventDetailModal from "@/components/schedule/EventDetailModal";

export default function SchedulePage({ params }) {
  const resolvedParams = use(params);
  const scheduleId = resolvedParams.id;

  const [schedule, setSchedule] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [viewMode, setViewMode] = useState("list");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user || !scheduleId) return;

    const fetchSchedule = async () => {
      try {
        const scheduleDoc = await getDoc(doc(db, "schedules", scheduleId));

        if (!scheduleDoc.exists()) {
          toast.error("Schedule not found");
          router.push("/");
          return;
        }

        setSchedule({ id: scheduleDoc.id, ...scheduleDoc.data() });

        const memberDoc = await getDoc(
          doc(db, "schedules", scheduleId, "members", user.uid)
        );
        if (memberDoc.exists()) {
          setUserRole(memberDoc.data().role);
        } else if (scheduleDoc.data().ownerId === user.uid) {
          setUserRole("admin");
        } else {
          toast.error("You do not have access to this schedule");
          router.push("/");
          return;
        }
      } catch (error) {
        console.error("Error fetching schedule:", error);
        toast.error("Failed to load schedule");
      }
    };

    const unsubscribe = onSnapshot(
      collection(db, "schedules", scheduleId, "members"),
      (snapshot) => {
        const membersData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setMembers(membersData);
        setLoading(false);
      }
    );

    fetchSchedule();

    return () => unsubscribe();
  }, [user, scheduleId, router]);

  const handleRemoveMember = async (memberId) => {
    if (memberId === user.uid) {
      toast.error("You can't remove yourself");
      return;
    }

    if (confirm("Are you sure you want to remove this member?")) {
      try {
        await deleteDoc(doc(db, "schedules", scheduleId, "members", memberId));
        toast.success("Member removed successfully");
      } catch (error) {
        console.error("Error removing member:", error);
        toast.error("Failed to remove member");
      }
    }
  };

  const handleCalendarDateClick = () => {
    setShowCreateEvent(true);
    setShowAddMember(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl">Loading...</div>
      </div>
    );
  }

  if (!schedule) {
    return null;
  }

  const canManageMembers = userRole === "admin";
  const canCreateEvents = userRole === "admin" || userRole === "editor";

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-blue-500 hover:text-blue-700">
                ← Back to Schedules
              </Link>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-500">
                Your role:{" "}
                <span className="font-medium capitalize">{userRole}</span>
              </span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h1 className="text-3xl font-bold mb-2">{schedule.title}</h1>
          {schedule.description && (
            <p className="text-gray-600 mb-4">{schedule.description}</p>
          )}
          <p className="text-sm text-gray-500">
            Created by {schedule.ownerName} on{" "}
            {new Date(schedule.createdAt).toLocaleDateString()}
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">
                  Members ({members.length})
                </h2>
                {canManageMembers && (
                  <button
                    onClick={() => {
                      setShowAddMember(!showAddMember);
                      setShowCreateEvent(false);
                    }}
                    className="text-sm bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                  >
                    {showAddMember ? "Cancel" : "Add"}
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-2 rounded hover:bg-gray-50"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {member.displayName}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {member.email}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          member.role === "admin"
                            ? "bg-purple-100 text-purple-800"
                            : member.role === "editor"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {member.role}
                      </span>
                      {canManageMembers && member.id !== user.uid && (
                        <button
                          onClick={() => handleRemoveMember(member.id)}
                          className="text-red-500 hover:text-red-700 text-xs"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {canManageMembers && showAddMember && (
              <div className="mt-6">
                <AddMember scheduleId={scheduleId} />
              </div>
            )}
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                  <h2 className="text-xl font-semibold">Schedule Events</h2>
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => setViewMode("list")}
                      className={`px-3 py-1 rounded ${
                        viewMode === "list"
                          ? "bg-white shadow text-gray-900"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      List
                    </button>
                    <button
                      onClick={() => setViewMode("calendar")}
                      className={`px-3 py-1 rounded ${
                        viewMode === "calendar"
                          ? "bg-white shadow text-gray-900"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      Calendar
                    </button>
                  </div>
                </div>
                {canCreateEvents && (
                  <button
                    onClick={() => {
                      setShowCreateEvent(!showCreateEvent);
                      setShowAddMember(false);
                    }}
                    className="text-sm bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                  >
                    {showCreateEvent ? "Cancel" : "New Event"}
                  </button>
                )}
              </div>

              {showCreateEvent && canCreateEvents && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-lg font-medium mb-4">Create New Event</h3>
                  <CreateEvent
                    scheduleId={scheduleId}
                    onSuccess={() => setShowCreateEvent(false)}
                  />
                </div>
              )}

              {viewMode === "list" ? (
                <EventList scheduleId={scheduleId} userRole={userRole} />
              ) : (
                <CalendarView
                  scheduleId={scheduleId}
                  onEventClick={setSelectedEvent}
                  onDateClick={canCreateEvents ? handleCalendarDateClick : null}
                />
              )}

              {userRole === "viewer" && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-800">
                    You have view-only access to this schedule. Contact an admin
                    to get edit permissions.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </div>
  );
}
