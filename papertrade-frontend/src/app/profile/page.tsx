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

    async function submit(e:any){
        e.preventDefault();

        if(formData.new_password && formData.new_password !== formData.confirm_password){
            setMessage("Passwords do not match");
            return;
        }

        setLoading(true);
        setMessage("");

        try{
            const data:any = {};
            if(formData.full_name) data.full_name = formData.full_name;
            if(formData.email) data.email = formData.email;
            if(formData.new_password) data.password = formData.new_password;

            await authAPI.updateProfile(data);
            setMessage("Profile updated successfully ✔");

            setFormData({...formData,new_password:"",confirm_password:"",current_password:""});
        }
        catch(err:any){
            setMessage(err.response?.data?.message || "Failed to update profile");
        }
        setLoading(false);
    }

    return(

        <div className="max-w-3xl mx-auto space-y-10">

            {/* ─────────── Header ─────────── */}
            <header>
                <h1 className="text-4xl font-bold text-gray-900">Profile Settings</h1>
                <p className="text-gray-500 mt-1">Update your account information</p>
            </header>

            {/* ─────────── Alerts ─────────── */}
            {message && (
                <div className={`p-4 rounded-lg text-sm font-medium ${
                    message.includes("success") 
                    ? "bg-green-50 border border-green-200 text-green-700"
                    : "bg-red-50 border border-red-200 text-red-700"
                }`}>
                    {message}
                </div>
            )}

            <form onSubmit={submit} className="space-y-10">

                {/* ─────────── Personal Info ─────────── */}
                <section className="bg-white border border-gray-200 rounded-xl shadow-sm p-8 space-y-6">

                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <User size={18}/>
                        Personal Information
                    </h2>

                    <div className="space-y-5">

                        <div>
                            <label className="block text-gray-600 text-sm mb-1">Full Name</label>
                            <input
                                value={formData.full_name}
                                onChange={(e)=>setFormData({...formData,full_name:e.target.value})}
                                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-black outline-none"
                                placeholder="John Doe"
                            />
                        </div>

                        <div>
                            <label className="block text-gray-600 text-sm mb-1">Email</label>
                            <div className="relative">
                                <Mail size={18} className="absolute left-3 top-3 text-gray-400"/>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e)=>setFormData({...formData,email:e.target.value})}
                                    className="w-full pl-10 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-black outline-none"
                                    placeholder="you@example.com"
                                />
                            </div>
                        </div>
                    </div>
                </section>


                {/* ─────────── Password Panel ─────────── */}
                <section className="bg-white border border-gray-200 rounded-xl shadow-sm p-8 space-y-6">

                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <Lock size={18}/>
                        Change Password
                    </h2>

                    <div className="space-y-5">

                        <div>
                            <label className="block text-gray-600 text-sm mb-1">Current Password</label>
                            <input
                                type="password"
                                value={formData.current_password}
                                onChange={(e)=>setFormData({...formData,current_password:e.target.value})}
                                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-black outline-none"
                                placeholder="••••••••"
                            />
                        </div>

                        <div>
                            <label className="block text-gray-600 text-sm mb-1">New Password</label>
                            <input
                                type="password"
                                value={formData.new_password}
                                onChange={(e)=>setFormData({...formData,new_password:e.target.value})}
                                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-black outline-none"
                                placeholder="••••••••"
                            />
                        </div>

                        <div>
                            <label className="block text-gray-600 text-sm mb-1">Confirm New Password</label>
                            <input
                                type="password"
                                value={formData.confirm_password}
                                onChange={(e)=>setFormData({...formData,confirm_password:e.target.value})}
                                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-black outline-none"
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
                    <Save size={20}/>
                    {loading?"Saving...":"Save Changes"}
                </button>

            </form>
        </div>
    );
}
