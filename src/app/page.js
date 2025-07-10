"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import LoginForm from "@/components/auth/LoginForm";
import SignupForm from "@/components/auth/SignupForm";
import CreateSchedule from "@/components/schedule/CreateSchedule";
import ScheduleList from "@/components/schedule/ScheduleList";

export default function Home() {
  const { user, loading, logout } = useAuth();
  const [showLogin, setShowLogin] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        {showLogin ? (
          <LoginForm onToggle={() => setShowLogin(false)} />
        ) : (
          <SignupForm onToggle={() => setShowLogin(true)} />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold">Schedule App</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">
                Welcome, {user.displayName || user.email}
              </span>
              <button
                onClick={logout}
                className="text-gray-500 hover:text-gray-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6 flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">My Schedules</h2>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
            >
              {showCreateForm ? "Cancel" : "New Schedule"}
            </button>
          </div>

          {showCreateForm && (
            <div className="mb-8 bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4">
                Create New Schedule
              </h3>
              <CreateSchedule onSuccess={() => setShowCreateForm(false)} />
            </div>
          )}

          <ScheduleList />
        </div>
      </main>
    </div>
  );
}
