import Link from 'next/link';

export default function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-center px-4">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Page Not Found</h2>
            <p className="text-gray-600 mb-8">Could not find the requested resource</p>
            <Link
                href="/"
                className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition font-medium"
            >
                Return Home
            </Link>
        </div>
    );
}
