"use client";

import { useState, useEffect, use } from "react";
import { doc, getDoc, collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

export default function SchedulePage({ params }) {
  // Unwrap the params promise
  const resolvedParams = use(params);
  const scheduleId = resolvedParams.id;

  const [schedule, setSchedule] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
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

        // Check user's role
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

    // Listen to members changes
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
                Your role: <span className="font-medium">{userRole}</span>
              </span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h1 className="text-3xl font-bold mb-2">{schedule.title}</h1>
          <p className="text-gray-600 mb-4">{schedule.description}</p>
          <p className="text-sm text-gray-500">
            Created by {schedule.ownerName} on{" "}
            {new Date(schedule.createdAt).toLocaleDateString()}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">
            Members ({members.length})
          </h2>
          <div className="space-y-3">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 border rounded"
              >
                <div>
                  <p className="font-medium">{member.displayName}</p>
                  <p className="text-sm text-gray-500">{member.email}</p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-sm ${
                    member.role === "admin"
                      ? "bg-purple-100 text-purple-800"
                      : member.role === "editor"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {member.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
