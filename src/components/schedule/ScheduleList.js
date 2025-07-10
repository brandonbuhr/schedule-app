"use client";

import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";

export default function ScheduleList() {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const ownedSchedulesQuery = query(
      collection(db, "schedules"),
      where("ownerId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      ownedSchedulesQuery,
      (snapshot) => {
        const schedulesData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setSchedules(schedulesData);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching schedules:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  if (loading) {
    return <div className="text-center py-4">Loading schedules...</div>;
  }

  if (schedules.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No schedules yet. Create your first one!</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {schedules.map((schedule) => (
        <Link
          key={schedule.id}
          href={`/schedules/${schedule.id}`}
          className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
        >
          <h3 className="text-lg font-semibold mb-2">{schedule.title}</h3>
          <p className="text-gray-600 text-sm mb-4">{schedule.description}</p>
          <div className="text-xs text-gray-500">
            Created {new Date(schedule.createdAt).toLocaleDateString()}
          </div>
        </Link>
      ))}
    </div>
  );
}
