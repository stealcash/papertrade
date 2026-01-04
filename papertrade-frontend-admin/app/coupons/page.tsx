'use client';

import { useEffect, useState } from 'react';
import { couponsAPI } from '@/lib/api';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

export default function CouponsPage() {
    const [coupons, setCoupons] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCoupons();
    }, []);

    const fetchCoupons = async () => {
        try {
            setLoading(true);
            const res = await couponsAPI.getAll();
            setCoupons(res.data.data || []);
        } catch (error) {
            console.error(error);
            toast.error('Failed to fetch coupons');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure?')) return;
        try {
            await couponsAPI.delete(id);
            setCoupons(coupons.filter(c => c.id !== id));
            toast.success('Coupon deleted');
        } catch (error) {
            toast.error('Failed to delete coupon');
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold dark:text-white">Coupons</h1>
                <Link href="/coupons/create" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
                    Create Coupon
                </Link>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border dark:border-gray-700 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Discount</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valid Until</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usage</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                        {loading ? (
                            <tr><td colSpan={5} className="p-4 text-center">Loading...</td></tr>
                        ) : coupons.length === 0 ? (
                            <tr><td colSpan={5} className="p-4 text-center">No coupons found</td></tr>
                        ) : (
                            coupons.map((coupon) => (
                                <tr key={coupon.id}>
                                    <td className="px-6 py-4 whitespace-nowrap dark:text-white font-medium">{coupon.code}</td>
                                    <td className="px-6 py-4 whitespace-nowrap dark:text-gray-300">{coupon.discount_percent}%</td>
                                    <td className="px-6 py-4 whitespace-nowrap dark:text-gray-300">
                                        {new Date(coupon.valid_until).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap dark:text-gray-300">
                                        {coupon.used_count} / {coupon.max_usage === 0 ? '∞' : coupon.max_usage}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <button
                                            onClick={() => handleDelete(coupon.id)}
                                            className="text-red-600 hover:text-red-900 text-sm"
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
