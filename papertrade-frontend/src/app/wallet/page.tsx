'use client';

import { useEffect, useState } from 'react';
import { authAPI, paymentsAPI } from '@/lib/api';
import { Wallet as WalletIcon, Plus, History } from 'lucide-react';

const MOCK = {
    balance: 97500,
    records: [
        { id: 1, type: "Refill", amount: 100000, status: "completed", created_at: new Date(Date.now()-86400000*5).toISOString() },
        { id: 2, type: "Trade", amount: -2500, status: "completed", created_at: new Date(Date.now()-86400000*3).toISOString() },
    ]
};

export default function WalletPage(){

    const [balance,setBalance] = useState<number>(0);
    const [records,setRecords] = useState<any[]>([]);
    const [loading,setLoading] = useState(true);

    const [refill,setRefill] = useState("");
    const [open,setOpen] = useState(false);

    useEffect(()=>{ load(); },[]);

    async function load(){
        try{
            const [p,r] = await Promise.all([
                authAPI.profile(),
                paymentsAPI.getRecords(),
            ]);
            setBalance(parseFloat(p.data.data.wallet_balance)||0);
            setRecords(r.data.data||[]);
        }catch{
            setBalance(MOCK.balance);
            setRecords(MOCK.records);
        }
        setLoading(false);
    }

    async function refillWallet(){
        if(!refill || +refill<=0) return alert("Enter valid amount");
        try{
            await paymentsAPI.refillWallet(+refill);
            setOpen(false); setRefill(""); load();
        }catch{
            alert("Refill available only after backend live");
        }
    }

    if(loading) return(
        <div className="flex justify-center items-center h-64 text-gray-500">Loading wallet...</div>
    );

    return(

        <div className="space-y-10 max-w-5xl">

            {/* ---------- Header ---------- */}
            <header>
                <h1 className="text-4xl font-bold text-gray-900">Wallet</h1>
                <p className="text-gray-500 mt-1">Manage balance & transactions</p>
            </header>


            {/* ---------- Balance Card ---------- */}
            <div className="border border-gray-200 bg-white rounded-xl p-8 shadow-sm flex justify-between items-center">

                <div>
                    <p className="text-gray-500 text-sm">Available Balance</p>
                    <h2 className="text-5xl font-bold text-gray-900 mt-2">₹{balance.toLocaleString()}</h2>
                </div>

                <WalletIcon size={60} className="text-gray-300" />

            </div>

            <button
                onClick={()=>setOpen(true)}
                className="px-6 py-3 bg-black hover:bg-gray-900 text-white text-sm font-semibold rounded-lg flex items-center gap-2"
            >
                <Plus size={18}/>
                Refill Wallet
            </button>



            {/* ---------- Transaction History ---------- */}

            <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">

                <div className="border-b border-gray-200 p-6 flex items-center gap-2">
                    <History size={22}/>
                    <h2 className="text-2xl font-bold text-gray-900">Transaction History</h2>
                </div>

                {records.length ? (
                    <div className="divide-y divide-gray-200">
                        {records.map(x=>(
                            <div key={x.id} className="p-6 hover:bg-gray-50 transition">
                                
                                <div className="flex justify-between items-center">

                                    <div>
                                        <p className="font-semibold text-gray-900">{x.type}</p>
                                        <p className="text-gray-500 text-sm">
                                            {new Date(x.created_at).toLocaleString()}
                                        </p>
                                    </div>

                                    <div className="text-right">
                                        <p className={`text-lg font-bold ${x.amount>=0?"text-green-600":"text-red-500"}`}>
                                            {x.amount>=0?"+":""}₹{Math.abs(x.amount).toLocaleString()}
                                        </p>
                                        <p className="text-gray-500 text-xs capitalize">{x.status}</p>
                                    </div>

                                </div>

                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-10 text-center text-gray-500">No transactions yet</div>
                )}

            </div>



            {/* ---------- Refill Modal ---------- */}
            {open &&(
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl border border-gray-200 p-8 w-full max-w-md shadow-lg">

                        <h3 className="text-2xl font-bold text-gray-900 mb-4">Refill Wallet</h3>

                        <input
                            value={refill}
                            onChange={(e)=>setRefill(e.target.value)}
                            type="number"
                            placeholder="Enter amount"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black outline-none mb-5"
                        />

                        <div className="flex gap-3">
                            <button
                                onClick={refillWallet}
                                className="flex-1 py-3 bg-black hover:bg-gray-900 text-white font-semibold rounded-lg"
                            >Add</button>

                            <button
                                onClick={()=>{setOpen(false);setRefill("");}}
                                className="flex-1 py-3 border border-gray-300 rounded-lg hover:bg-gray-100"
                            >Cancel</button>
                        </div>

                    </div>
                </div>
            )}

        </div>
    );
}
