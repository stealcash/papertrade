'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, subscriptionsAPI } from '@/lib/api';
import { User, Mail, Lock, Save } from 'lucide-react';

export default function ProfilePage() {
    const router = useRouter();

    const [formData, setFormData] = useState({
        first_name: "",
        last_name: "",
        email: "",
        current_password: "",
        new_password: "",
        confirm_password: "",
    });

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    useEffect(() => {
        fetchProfile();
    }, []);

    async function fetchProfile() {
        try {
            const res = await authAPI.profile();
            const u = res.data.data;
            setFormData(prev => ({
                ...prev,
                first_name: u.first_name || "",
                last_name: u.last_name || "",
                email: u.email || "",
            }));
        } catch (error) {
            console.error(error);
        }
    }

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
            if (formData.first_name) data.first_name = formData.first_name;
            if (formData.last_name) data.last_name = formData.last_name;
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
                                <input
                                    type="text"
                                    value={formData.first_name}
                                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last Name</label>
                                <input
                                    type="text"
                                    value={formData.last_name}
                                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
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

                {/* ─────────── Subscription Panel ─────────── */}
                <SubscriptionSection />

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

function SubscriptionSection() {
    const [subscription, setSubscription] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter(); // Use the hook from top level if possible, or new one here. 
    // Actually useRouter is a hook so it must be called in a component. 
    // But since SubscriptionSection is a component, it's fine. 
    // However, I need to make sure useRouter is imported. It is imported at top level now.

    useEffect(() => {
        fetchSubscription();
    }, []);

    const fetchSubscription = async () => {
        try {
            const res = await subscriptionsAPI.getCurrent();
            setSubscription(res.data.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading subscription...</div>;

    const planName = subscription?.plan?.name || "No Active Plan";
    // const status = subscription?.status || "Inactive";
    const isActive = subscription?.is_active;
    const expiry = subscription?.end_date ? new Date(subscription.end_date).toLocaleDateString() : "N/A";

    return (
        <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm p-8 space-y-6">
            <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-900 dark:text-gray-100">
                <span className="p-1 bg-blue-100 text-blue-600 rounded">💎</span>
                Subscription
            </h2>

            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">{planName}</h3>
                    <p className={`text-sm font-medium mt-1 ${isActive ? 'text-green-600' : 'text-red-500'}`}>
                        {isActive ? 'Active' : 'Expired'} • Expires on {expiry}
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => router.push('/subscription')}
                    className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium rounded-lg transition shadow-md"
                >
                    Upgrade Plan
                </button>
            </div>

            {subscription?.plan?.features && (
                <div className="mt-4">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Current Limits:</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400">
                        {Object.entries(subscription.plan.features).map(([key, config]: any) => {

                            return config.enabled && (
                                <div key={key} className="flex justify-between border-b dark:border-gray-700 pb-1">
                                    <span className="capitalize">{key.replace('_', ' ').toLowerCase()}</span>
                                    <span className="font-mono">{config.limit === -1 ? '∞' : config.limit}</span>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}
        </section>
    );
}

// Ensure useEffect is imported or use React.useEffect if imports are messy
// Ideally add imports to top of file
