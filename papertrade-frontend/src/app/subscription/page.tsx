'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';

export default function SubscriptionPage(){

  const router = useRouter();
  const { isAuthenticated } = useSelector((s:RootState)=>s.auth);

  useEffect(()=>{
    if(!isAuthenticated) router.push("/login");
  },[isAuthenticated,router]);

  const plans = [

    {
      id:"trial",
      name:"Free Trial",
      price:"₹0",
      duration:"7 Days",
      features:["Basic backtesting","Up to 5 runs","Community strategies"],
    },

    {
      id:"monthly",
      name:"Monthly",
      price:"₹999",
      duration:"/ month",
      features:["Unlimited Backtests","All Strategies","Priority Support"],
    },

    {
      id:"yearly",
      name:"Yearly",
      price:"₹9,999",
      duration:"/ year",
      features:["Everything in Monthly","2 Months Free","Dedicated Support"],
    },

  ];

  return(

    <div className="max-w-6xl space-y-10 mx-auto">

      {/* ---------- Page Title ---------- */}
      <header>
        <h1 className="text-4xl font-bold text-gray-900">Subscription Plans</h1>
        <p className="text-gray-500 mt-1">Choose a plan that fits your usage & growth</p>
      </header>

      {/* ---------- Pricing Cards ---------- */}
      <div className="grid gap-8 md:grid-cols-3">

        {plans.map(p=>(
          <div
            key={p.id}
            className="rounded-xl border border-gray-200 p-8 bg-white shadow-sm hover:shadow-md transition flex flex-col justify-between"
          >

            <div>
              <h2 className="text-2xl font-semibold text-gray-900">{p.name}</h2>

              <div className="mt-4 mb-6">
                <span className="text-4xl font-bold text-gray-900">{p.price}</span>
                <span className="text-gray-500 ml-1 text-lg">{p.duration}</span>
              </div>

              <ul className="space-y-3">
                {p.features.map((f,i)=>(
                  <li key={i} className="text-sm text-gray-600">• {f}</li>
                ))}
              </ul>
            </div>

            {/* Action Button */}
            <button
              className="mt-8 w-full py-3 bg-black hover:bg-gray-900 text-white font-semibold rounded-lg transition"
            >
              Subscribe
            </button>

          </div>
        ))}

      </div>

    </div>
  )
}
