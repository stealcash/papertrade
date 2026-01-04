'use client';

import { useEffect, useState } from 'react';
import { plansAPI } from '@/lib/api';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

export default function PlansPage() {
    const [plans, setPlans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        try {
            setLoading(true);
            const res = await plansAPI.getAll();
            setPlans(res.data.data || []);
        } catch (error) {
            console.error(error);
            toast.error('Failed to fetch plans');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold dark:text-white">Subscription Plans</h1>
                <Link href="/plans/create" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
                    Create Plan
                </Link>
            </div>

            {loading ? (
                <div>Loading...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {plans.map((plan) => (
                        <div key={plan.id} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border dark:border-gray-700">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-xl font-semibold dark:text-white">{plan.name}</h3>
                                    <span className="text-sm text-gray-500">{plan.slug}</span>
                                </div>
                                <span className={`px-2 py-1 text-xs rounded-full ${plan.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                    {plan.is_active ? 'Active' : 'Inactive'}
                                </span>
                            </div>

                            <p className="text-gray-600 dark:text-gray-300 mb-4 h-12 overflow-hidden">{plan.description}</p>

                            <div className="mb-4">
                                <h4 className="font-medium mb-2 dark:text-gray-200">Pricing</h4>
                                <div className="space-y-1">
                                    <div className="text-sm dark:text-gray-400 flex justify-between">
                                        <span>Monthly</span>
                                        <span className="font-semibold">₹{plan.monthly_price}</span>
                                    </div>
                                    <div className="text-sm dark:text-gray-400 flex justify-between">
                                        <span>Yearly</span>
                                        <span className="font-semibold">₹{plan.yearly_price}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="mb-4">
                                <h4 className="font-medium mb-2 dark:text-gray-200">Features</h4>
                                <div className="text-xs text-gray-500 bg-gray-50 dark:bg-gray-900 p-2 rounded max-h-32 overflow-y-auto">
                                    {plan.features ? (
                                        <pre>{JSON.stringify(plan.features, null, 2)}</pre>
                                    ) : (
                                        <span>No features configured</span>
                                    )}
                                </div>
                            </div>

                            <div className="border-t dark:border-gray-700 pt-4 mt-4">
                                <Link href={`/plans/${plan.id}`} className="text-blue-600 hover:text-blue-500 text-sm font-medium">
                                    Edit Details →
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
