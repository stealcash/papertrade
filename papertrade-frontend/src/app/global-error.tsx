'use client';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <html>
            <body>
                <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50 text-center">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Something went wrong!</h2>
                    <p className="text-gray-600 mb-6 max-w-md">
                        We apologize for the inconvenience. An unexpected error has occurred.
                    </p>
                    <button
                        onClick={() => reset()}
                        className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition"
                    >
                        Try again
                    </button>
                </div>
            </body>
        </html>
    );
}
