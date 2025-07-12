"use client";

import { useState } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import toast from "react-hot-toast";

export default function AddMember({ scheduleId }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("viewer");
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const handleAddMember = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const usersQuery = query(
        collection(db, "users"),
        where("email", "==", email.toLowerCase().trim())
      );
      const userSnapshot = await getDocs(usersQuery);

      if (userSnapshot.empty) {
        toast.error("No user found with this email address");
        setLoading(false);
        return;
      }

      const newMember = userSnapshot.docs[0];
      const newMemberData = newMember.data();

      const memberDoc = await getDoc(
        doc(db, "schedules", scheduleId, "members", newMember.id)
      );
      if (memberDoc.exists()) {
        toast.error("This user is already a member of this schedule");
        setLoading(false);
        return;
      }

      await setDoc(doc(db, "schedules", scheduleId, "members", newMember.id), {
        email: newMemberData.email,
        displayName: newMemberData.displayName || newMemberData.email,
        role,
        addedAt: new Date().toISOString(),
        addedBy: user.uid,
      });

      toast.success(
        `${
          newMemberData.displayName || newMemberData.email
        } added successfully!`
      );
      setEmail("");
      setRole("viewer");
    } catch (error) {
      console.error("Error adding member:", error);
      toast.error("Failed to add member");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Add New Member</h3>
      <form onSubmit={handleAddMember} className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Email Address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="member@example.com"
            required
          />
          <p className="mt-1 text-sm text-gray-500">
            User must have an account with this email
          </p>
        </div>

        <div>
          <label
            htmlFor="role"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Permission Level
          </label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="viewer">Viewer (Can only view)</option>
            <option value="editor">Editor (Can edit events)</option>
            <option value="admin">Admin (Full access)</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Adding..." : "Add Member"}
        </button>
      </form>
    </div>
  );
}
