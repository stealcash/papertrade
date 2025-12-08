'use client';

import { useEffect, useState } from 'react';
import { strategiesAPI } from '@/lib/api';
import { Layers, Users, Plus } from 'lucide-react';

// ---------------- Mock as fallback ---------------- //
const MOCK_PREDEFINED = [
    { id: 1, name: "Moving Average Crossover", description: "Classic trend-following strategy using 50 & 200 MA" },
    { id: 2, name: "RSI Mean Reversion", description: "Buy oversold / sell overbought using RSI" },
    { id: 3, name: "Breakout Trading", description: "Trades support / resistance breakouts" },
];

const MOCK_RULE_BASED = [
    { id: 1, name: "My Custom Strategy", description: "MACD + Volume signals combined" },
    { id: 2, name: "Sector Rotation", description: "Momentum-based sector allocation" },
];

export default function StrategyPage(){

    const [predefined,setPredefined] = useState<any[]>([]);
    const [custom,setCustom] = useState<any[]>([]);
    const [loading,setLoading] = useState(true);

    useEffect(()=>{ load(); },[]);

    async function load(){
        try{
            const p = await strategiesAPI.getPredefined();
            const r = await strategiesAPI.getRuleBased();
            setPredefined(p.data.data||[]);
            setCustom(r.data.data||[]);
        }catch{
            setPredefined(MOCK_PREDEFINED);
            setCustom(MOCK_RULE_BASED);
        }
        setLoading(false);
    }

    if(loading) return(
        <div className="flex justify-center items-center h-64 text-gray-500 text-lg">
            Loading strategies...
        </div>
    );

    return(

        <div className="space-y-12 max-w-7xl">

            {/* ---------------- Header ---------------- */}
            <div className="flex justify-between items-center">
                <h1 className="text-4xl font-bold text-gray-900">Strategies</h1>
                <button className="flex items-center gap-2 bg-black hover:bg-gray-800 text-white px-6 py-3 rounded-lg text-sm font-semibold transition">
                    <Plus size={20}/>
                    Create Strategy
                </button>
            </div>

            {/* ---------------- Predefined Section ---------------- */}
            <section className="space-y-5">
                <div className="flex items-center gap-2">
                    <Layers size={22} className="text-black"/>
                    <h2 className="text-2xl font-bold text-gray-900">Predefined Strategies</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {predefined.length ? predefined.map((s)=>(
                        <div key={s.id}
                            className="border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition bg-white"
                        >

                            <h3 className="text-gray-900 font-semibold text-lg mb-2">{s.name}</h3>
                            <p className="text-gray-500 text-sm mb-5 leading-relaxed">{s.description}</p>

                            <button className="w-full py-2.5 rounded-md bg-black text-white text-sm font-semibold hover:bg-gray-900 transition">
                                Use Strategy
                            </button>

                        </div>
                    ))
                    :
                    <p className="text-gray-500 col-span-full text-center py-6">
                        No predefined strategies available
                    </p>}
                </div>
            </section>

            {/* ---------------- Custom Strategies ---------------- */}
            <section className="space-y-5">
                <div className="flex items-center gap-2">
                    <Users size={22} className="text-black"/>
                    <h2 className="text-2xl font-bold text-gray-900">My Strategies</h2>
                </div>

                <div className="border border-gray-200 rounded-xl shadow-sm overflow-hidden bg-white">
                    {custom.length ? (
                        <div className="divide-y divide-gray-200">

                            {custom.map((s)=>(
                                <div key={s.id} className="p-6 hover:bg-gray-50 transition">
                                    <h3 className="text-gray-900 font-semibold text-lg mb-1">{s.name}</h3>
                                    <p className="text-gray-500 text-sm mb-4">{s.description}</p>

                                    <div className="flex gap-3">
                                        <button className="px-5 py-2 bg-black text-white rounded-md text-sm hover:bg-gray-900 transition">
                                            Run Backtest
                                        </button>
                                        <button className="px-5 py-2 border border-gray-300 bg-white rounded-md text-sm text-gray-800 hover:bg-gray-100 transition">
                                            Edit
                                        </button>
                                    </div>
                                </div>
                            ))}

                        </div>
                    ):(
                        <p className="p-8 text-center text-gray-500">No custom strategies yet</p>
                    )}
                </div>
            </section>

        </div>
    )
}
