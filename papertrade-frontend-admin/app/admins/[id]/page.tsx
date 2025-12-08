'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import apiClient from '@/lib/api';
import React from 'react';

export default function EditAdminPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { user } = useSelector((state: RootState) => state.auth);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    // Unwrap params using React.use() or await in useEffect, but for client component typical pattern:    
    const [adminId, setAdminId] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        email: '',
        name: '',
        role: 'admin',
        password: '',
        can_manage_stocks: false,
    });

    useEffect(() => {
        const resolveParams = async () => {
            const resolvedParams = await params;
            setAdminId(resolvedParams.id);
        };
        resolveParams();
    }, [params]);

    useEffect(() => {
        if (!adminId) return;

        const fetchAdmin = async () => {
            try {
                const response = await apiClient.get(`/admin-panel/admins/${adminId}/`);
                const admin = response.data.data;
                setFormData({
                    email: admin.email,
                    name: admin.name,
                    role: admin.role,
                    password: '', // Password is not retrieved
                    can_manage_stocks: admin.can_manage_stocks || false,
                });
            } catch (err: any) {
                setError(err.response?.data?.message || 'Failed to fetch admin details');
            } finally {
                setLoading(false);
            }
        };

        fetchAdmin();
    }, [adminId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess(false);
        setSaving(true);

        try {
            const dataToUpdate: any = {
                name: formData.name,
                role: formData.role,
                can_manage_stocks: formData.can_manage_stocks,
            };
            if (formData.password) {
                dataToUpdate.password = formData.password;
            }

            await apiClient.put(`/admin-panel/admins/${adminId}/`, dataToUpdate);
            setSuccess(true);
            setTimeout(() => {
                router.push('/admins');
            }, 1000);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to update admin');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="text-gray-500">Loading admin details...</div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Edit Admin User</h1>
                    <p className="text-sm text-gray-500 mt-1">Update admin details and permissions</p>
                </div>
                <button
                    onClick={() => router.back()}
                    className="text-gray-500 hover:text-gray-700"
                >
                    Cancel
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    {/* Success Message */}
                    {success && (
                        <div className="bg-green-50 text-green-600 p-4 rounded-lg text-sm">
                            Admin updated successfully! Redirecting...
                        </div>
                    )}

                    {/* Email (Read only) */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Email Address
                        </label>
                        <input
                            type="email"
                            value={formData.email}
                            disabled
                            className="w-full px-4 py-3 bg-gray-50 text-gray-500 border border-gray-200 rounded-lg cursor-not-allowed"
                        />
                        <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
                    </div>

                    {/* Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Full Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                            className="w-full px-4 py-3 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                    </div>

                    {/* Role */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Role <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={formData.role}
                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                            className="w-full px-4 py-3 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none"
                            style={{ backgroundImage: 'none' }} // Remove default arrow if needed, or keep it
                        >
                            <option value="admin">Admin</option>
                            <option value="superadmin">Super Admin</option>
                            <option value="moderator">Moderator</option>
                            <option value="analyst">Analyst</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                            Super Admins have full access to all system features.
                        </p>
                    </div>

                    {formData.role === 'admin' && (
                        <div className="flex items-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <input
                                id="can_manage_stocks"
                                type="checkbox"
                                checked={formData.can_manage_stocks}
                                onChange={(e) => setFormData({ ...formData, can_manage_stocks: e.target.checked })}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label htmlFor="can_manage_stocks" className="ml-2 block text-sm text-gray-900">
                                Can manage stocks and sectors
                            </label>
                        </div>
                    )}

                    {/* Password */}
                    <div className="pt-4 border-t border-gray-100">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            New Password <span className="text-gray-400 font-normal">(Leave blank to keep current)</span>
                        </label>
                        <input
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            minLength={6}
                            className="w-full px-4 py-3 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            placeholder="Enter new password"
                        />
                    </div>

                    {/* Submit Button */}
                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={saving}
                            className={`w - full py - 3 px - 4 rounded - lg text - white font - medium transition - colors ${saving
                                ? 'bg-indigo-400 cursor-not-allowed'
                                : 'bg-indigo-600 hover:bg-indigo-700'
                                }`}
                        >
                            {saving ? 'Saving Changes...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
