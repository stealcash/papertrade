'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import apiClient from '@/lib/api';

export default function TablesPage() {
    const router = useRouter();
    const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
    const [tables, setTables] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTable, setSelectedTable] = useState<string | null>(null);
    const [schema, setSchema] = useState<any[]>([]);
    const [foreignKeys, setForeignKeys] = useState<any[]>([]);
    const [loadingSchema, setLoadingSchema] = useState(false);
    const [mounted, setMounted] = useState(false);

    // Query Tab State
    const [activeTab, setActiveTab] = useState<'schema' | 'query'>('schema');
    const [queryInput, setQueryInput] = useState('');
    const [queryResult, setQueryResult] = useState<{ columns: string[], rows: any[][], error?: string, message?: string } | null>(null);
    const [executingQuery, setExecutingQuery] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted) return;

        if (!isAuthenticated) {
            router.push('/login');
            return;
        }
        if (user?.role !== 'superadmin') {
            router.push('/dashboard');
            return;
        }
        fetchTables();
    }, [isAuthenticated, user, mounted, router]);

    const fetchTables = async () => {
        try {
            const response = await apiClient.get('/admin-panel/database/tables/');
            setTables(response.data.data.tables || []);
        } catch (error) {
            console.error('Failed to fetch tables:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSchema = async (tableName: string) => {
        setLoadingSchema(true);
        setSelectedTable(tableName);
        setActiveTab('schema'); // Switch to schema tab when clicking a table
        try {
            const response = await apiClient.get(`/admin-panel/database/tables/${tableName}/`);
            setSchema(response.data.data.columns || []);
            setForeignKeys(response.data.data.foreign_keys || []);
        } catch (error) {
            console.error('Failed to fetch schema:', error);
        } finally {
            setLoadingSchema(false);
        }
    };

    const executeQuery = async () => {
        if (!queryInput.trim()) return;
        setExecutingQuery(true);
        setQueryResult(null);
        try {
            const response = await apiClient.post('/admin-panel/database/query/', { query: queryInput });
            const data = response.data.data;
            if (data.columns) {
                setQueryResult({ columns: data.columns, rows: data.rows });
            } else {
                setQueryResult({ columns: [], rows: [], message: data.message });
            }
        } catch (error: any) {
            console.error('Query execution failed:', error);
            setQueryResult({
                columns: [],
                rows: [],
                error: error.response?.data?.message || error.message || 'Query execution failed'
            });
        } finally {
            setExecutingQuery(false);
        }
    };

    if (!isAuthenticated || user?.role !== 'superadmin' || !mounted) {
        return <div className="min-h-screen flex items-center justify-center">
            <div>Loading...</div>
        </div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar List of Tables */}
            <div className="w-1/3 bg-white border-r border-gray-200 h-screen overflow-y-auto flex flex-col">
                <div className="p-4 border-b border-gray-200 bg-white sticky top-0 z-10">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-bold text-gray-800">Database Tools</h2>
                        <button
                            onClick={() => router.push('/dashboard')}
                            className="text-sm text-gray-500 hover:text-gray-700"
                        >
                            ← Back
                        </button>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg">
                        <button
                            onClick={() => setActiveTab('schema')}
                            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'schema'
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-gray-600 hover:text-gray-800'
                                }`}
                        >
                            Schema Viewer
                        </button>
                        <button
                            onClick={() => setActiveTab('query')}
                            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'query'
                                ? 'bg-white text-purple-600 shadow-sm'
                                : 'text-gray-600 hover:text-gray-800'
                                }`}
                        >
                            Run Query
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="p-8 text-center text-gray-500">Loading tables...</div>
                ) : (
                    <>
                        <div className="px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Public Tables
                        </div>
                        <ul className="divide-y divide-gray-100 flex-1">
                            {tables.map((table) => (
                                <li key={table}>
                                    <button
                                        onClick={() => {
                                            if (activeTab === 'query') {
                                                setQueryInput(`SELECT * FROM ${table} LIMIT 100;`);
                                            } else {
                                                fetchSchema(table);
                                            }
                                        }}
                                        className={`w-full text-left px-6 py-3 hover:bg-gray-50 transition-colors flex items-center justify-between group ${selectedTable === table && activeTab === 'schema' ? 'bg-blue-50 border-l-4 border-blue-600' : 'border-l-4 border-transparent'
                                            }`}
                                    >
                                        <span className={`font-medium ${selectedTable === table && activeTab === 'schema' ? 'text-blue-700' : 'text-gray-700'}`}>
                                            {table}
                                        </span>
                                        <span className="text-gray-400 group-hover:text-gray-600 text-xs">
                                            {activeTab === 'query' ? 'Select →' : 'Schema →'}
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </>
                )}
            </div>

            {/* Main Content Area */}
            <div className="w-2/3 h-screen overflow-y-auto bg-gray-50 p-8">

                {/* --- SQL QUERY MODE --- */}
                {activeTab === 'query' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">SQL Query Executor</h1>
                                <p className="text-sm text-gray-500 mt-1">Run raw SQL against the database. <span className="text-red-500 font-bold">Use with caution.</span></p>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                            <textarea
                                value={queryInput}
                                onChange={(e) => setQueryInput(e.target.value)}
                                placeholder="SELECT * FROM users LIMIT 10;"
                                className="w-full h-32 px-4 py-3 bg-gray-900 text-green-400 font-mono text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                                spellCheck="false"
                            />
                            <div className="mt-4 flex justify-end">
                                <button
                                    onClick={executeQuery}
                                    disabled={executingQuery || !queryInput.trim()}
                                    className={`px-5 py-2 rounded-lg font-medium text-white transition-all ${executingQuery || !queryInput.trim()
                                        ? 'bg-gray-400 cursor-not-allowed'
                                        : 'bg-purple-600 hover:bg-purple-700 shadow-md hover:shadow-lg'
                                        }`}
                                >
                                    {executingQuery ? 'Running...' : 'Run Query'}
                                </button>
                            </div>
                        </div>

                        {/* Query Results */}
                        {queryResult && (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-fade-in">
                                {queryResult.error ? (
                                    <div className="p-6 bg-red-50 border-l-4 border-red-500 text-red-700">
                                        <h3 className="font-bold mb-1">Error Executing Query</h3>
                                        <div className="font-mono text-sm">{queryResult.error}</div>
                                    </div>
                                ) : queryResult.message ? (
                                    <div className="p-6 bg-green-50 border-l-4 border-green-500 text-green-700">
                                        <h3 className="font-bold mb-1">Success</h3>
                                        <div className="text-sm">{queryResult.message}</div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col">
                                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                                            <span className="text-xs font-semibold uppercase text-gray-500">Query Results</span>
                                            <span className="text-xs text-gray-400">{queryResult.rows.length} rows found</span>
                                        </div>
                                        <div className="overflow-x-auto max-h-[500px]">
                                            <table className="min-w-full divide-y divide-gray-200">
                                                <thead className="bg-gray-50 sticky top-0">
                                                    <tr>
                                                        {queryResult.columns.map((col) => (
                                                            <th key={col} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                                                                {col}
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                    {queryResult.rows.map((row, idx) => (
                                                        <tr key={idx} className="hover:bg-gray-50">
                                                            {row.map((cell: any, cellIdx: number) => (
                                                                <td key={cellIdx} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                                                                    {cell?.toString() ?? <span className="text-gray-300">NULL</span>}
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}


                {/* --- SCHEMA MODE --- */}
                {activeTab === 'schema' && (
                    <>
                        {selectedTable ? (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-fade-in">
                                <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                                    <div>
                                        <h1 className="text-2xl font-bold text-gray-900">{selectedTable}</h1>
                                        <p className="text-sm text-gray-500 mt-1">Table structure definition</p>
                                    </div>
                                    <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                                        Postgres Public Schema
                                    </div>
                                </div>

                                {loadingSchema ? (
                                    <div className="p-12 text-center text-gray-500">Loading schema details...</div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Column Name</th>
                                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nullable</th>
                                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Default</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {schema.map((col: any) => {
                                                    const fk = foreignKeys.find((f: any) => f.column === col.name);
                                                    return (
                                                        <tr key={col.name} className="hover:bg-gray-50">
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 font-mono flex items-center gap-2">
                                                                {col.name}
                                                                {fk && (
                                                                    <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-100 text-indigo-700 border border-indigo-200" title={`References ${fk.foreign_table}(${fk.foreign_column})`}>
                                                                        FK → {fk.foreign_table}.{fk.foreign_column}
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-600 font-mono">
                                                                {col.type}
                                                                {col.max_length ? `(${col.max_length})` : ''}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                {col.nullable ? (
                                                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">NULL</span>
                                                                ) : (
                                                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">NOT NULL</span>
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                                                                {col.default || <span className="text-gray-300">-</span>}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {/* SQL Preview */}
                                {!loadingSchema && (
                                    <div className="bg-gray-900 p-6 text-gray-300 font-mono text-sm overflow-x-auto border-t border-gray-200">
                                        <div className="mb-2 text-gray-500">-- Simplified SQL Representation</div>
                                        <span className="text-purple-400">CREATE TABLE</span> <span className="text-yellow-300">{selectedTable}</span> (<br />
                                        {schema.map((col: any, idx: number) => (
                                            <div key={col.name} className="pl-4">
                                                <span className="text-blue-300">{col.name}</span> <span className="text-green-300">{col.type}</span>{col.max_length ? `(${col.max_length})` : ''}
                                                {col.nullable ? '' : ' NOT NULL'}
                                                {col.default ? ` DEFAULT ${col.default}` : ''}
                                                {idx < schema.length - 1 ? ',' : ''}
                                            </div>
                                        ))}
                                        );
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400">
                                <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                                </svg>
                                <p className="text-lg">Select a table from the sidebar to view its structure</p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
