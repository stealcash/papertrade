'use client';

import { useState } from 'react';
import { authAPI } from '@/lib/api';
import { User, Mail, Lock, Save } from 'lucide-react';

export default function ProfilePage() {

    const [formData, setFormData] = useState({
        full_name: "",
        email: "",
        current_password: "",
        new_password: "",
        confirm_password: "",
    });

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    async function submit(e: any) {
        e.preventDefault();

        if (formData.new_password && formData.new_password !== formData.confirm_password) {
            setMessage("Passwords do not match");
            return;
        }

        setLoading(true);
        setMessage("");

        try {
            const data: any = {};
            if (formData.full_name) data.full_name = formData.full_name;
            if (formData.email) data.email = formData.email;
            if (formData.new_password) data.password = formData.new_password;

            await authAPI.updateProfile(data);
            setMessage("Profile updated successfully ✔");

            setFormData({ ...formData, new_password: "", confirm_password: "", current_password: "" });
        }
        catch (err: any) {
            setMessage(err.response?.data?.message || "Failed to update profile");
        }
        setLoading(false);
    }

    return (

        <div className="max-w-3xl mx-auto space-y-10">

            {/* ─────────── Header ─────────── */}
            <header>
                <h1 className="text-4xl font-bold text-gray-900">Profile Settings</h1>
                <p className="text-gray-500 mt-1">Update your account information</p>
            </header>

            {/* ─────────── Alerts ─────────── */}
            {message && (
                <div className={`p-4 rounded-lg text-sm font-medium ${message.includes("success")
                    ? "bg-green-50 border border-green-200 text-green-700"
                    : "bg-red-50 border border-red-200 text-red-700"
                    }`}>
                    {message}
                </div>
            )}

            <form onSubmit={submit} className="space-y-10">

                {/* ─────────── Personal Info ─────────── */}
                {/* Right Column: Edit Details */}
                <div className="lg:col-span-2">
                    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-8">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-6">Personal Information</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">First Name</label>
                                <input type="text" defaultValue="John" className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last Name</label>
                                <input type="text" defaultValue="Doe" className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
                                <input type="email" defaultValue="john.doe@example.com" className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                        </div>

                        <div className="mt-8 pt-8 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3">
                            <button className="px-6 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 font-medium transition">
                                Cancel
                            </button>
                            <button className="px-6 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition shadow-sm">
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
                {/* ─────────── Password Panel ─────────── */}
                <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm p-8 space-y-6">

                    <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-900 dark:text-gray-100">
                        <Lock size={18} />
                        Change Password
                    </h2>

                    <div className="space-y-5">

                        <div>
                            <label className="block text-gray-600 dark:text-gray-300 text-sm mb-1">Current Password</label>
                            <input
                                type="password"
                                value={formData.current_password}
                                onChange={(e) => setFormData({ ...formData, current_password: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-md focus:ring-2 focus:ring-black dark:focus:ring-white outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                placeholder="••••••••"
                            />
                        </div>

                        <div>
                            <label className="block text-gray-600 dark:text-gray-300 text-sm mb-1">New Password</label>
                            <input
                                type="password"
                                value={formData.new_password}
                                onChange={(e) => setFormData({ ...formData, new_password: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-md focus:ring-2 focus:ring-black dark:focus:ring-white outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                placeholder="••••••••"
                            />
                        </div>

                        <div>
                            <label className="block text-gray-600 dark:text-gray-300 text-sm mb-1">Confirm New Password</label>
                            <input
                                type="password"
                                value={formData.confirm_password}
                                onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-md focus:ring-2 focus:ring-black dark:focus:ring-white outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                placeholder="••••••••"
                            />
                        </div>

                    </div>
                </section>


                {/* ─────────── Save Button ─────────── */}
                <button type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-black hover:bg-gray-800 text-white text-lg font-semibold rounded-md transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    <Save size={20} />
                    {loading ? "Saving..." : "Save Changes"}
                </button>

            </form>
        </div>
    );
}
