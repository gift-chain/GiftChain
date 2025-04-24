import React, { useState } from 'react';
import giftcard from '../assets/giftcard.png';

export function GenerateCard() {
    const [token, setToken] = useState('');
    const [amount, setAmount] = useState('');

    return (
        <div className="min-h-screen bg-[#0B0D3A] flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-[#101339] rounded-xl p-6 shadow-lg">
                <h2 className="text-white text-xl font-semibold mb-6">
                    Generate Card
                </h2>

                {/* Select Token */}
                <div className="mb-4">
                    <label className="block text-white text-sm mb-1">
                        Select Token
                    </label>
                    <div className="relative">
                        <select
                            value={token}
                            onChange={e => setToken(e.target.value)}
                            className="w-full bg-transparent border border-white rounded-lg px-4 py-3 text-white appearance-none focus:outline-none"
                        >
                            <option value="" disabled>
                                Select token
                            </option>
                            <option value="lsk">Lisk</option>
                            <option value="eth">Ethereum</option>
                            <option value="matic">Polygon</option>
                        </select>
                        {/* Dropdown arrow SVG */}
                        <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center">
                            <svg
                                className="w-4 h-4 text-white"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 9l-7 7-7-7"
                                />
                            </svg>
                        </div>
                    </div>
                </div>

                {/* Enter Amount */}
                <div className="mb-4">
                    <label className="block text-white text-sm mb-1">
                        Enter Amount
                    </label>
                    <input
                        type="number"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        placeholder="Enter amount"
                        className="w-full bg-transparent border border-white rounded-lg px-4 py-3 text-white placeholder-white focus:outline-none"
                    />
                </div>

                {/* Write a note */}
                <div className="mb-4">
                    <label className="block text-white text-sm mb-1">
                        Write a note
                    </label>
                    <input
                        // type="number"
                        // value={amount}
                        // onChange={e => setAmount(e.target.value)}
                        placeholder="Write a note (optional)"
                        className="w-full bg-transparent border border-white rounded-lg px-4 py-12 text-white placeholder-white focus:outline-none"
                    />
                </div>


                {/* Preview Card */}
                <div className="w-full h-40 bg-gradient-to-tr from-[#3E236A] to-[#582FA1] rounded-lg flex items-center justify-center overflow-hidden mt-6">
                    <img
                        src={giftcard}
                        alt="Card Preview"
                        className="object-cover w-full h-full rounded-lg" 
                    />
                </div>

                {/* Create Gift Card Button */}
                <button
                    type="button"
                    className="w-full bg-purple-600 hover:bg-purple-500 text-white font-medium py-3 rounded-lg transition mt-6"
                    onClick={() => {
                        /* placeholder handler */
                        console.log('Creating gift card:', { token, amount, optionalToken });
                    }}
                >
                    Create Gift Card
                </button>

            </div>
        </div>
    );
}



























// import React, { useState } from 'react';
// import { CalendarIcon } from '@heroicons/react/24/outline';

// const tokens = [
//   { label: 'Select token', value: '' },
//   { label: 'Lisk', value: 'lsk' },
//   { label: 'Ethereum', value: 'eth' },
//   { label: 'Polygon', value: 'matic' },
// ];

// export const GenerateCard: React.FC = () => {
//   const [primaryToken, setPrimaryToken] = useState('');
//   const [amount, setAmount] = useState('');
//   const [optionalToken, setOptionalToken] = useState('');
//   const [expiry, setExpiry] = useState('');

//   return (
//     <div className="w-full max-w-sm mx-auto bg-[#0B0D3A] rounded-xl p-6 space-y-6 shadow-2xl">
//       <h2 className="text-white text-lg font-semibold">Generate Card</h2>

//       {/* Primary Token Select */}
//       <div>
//         <label className="block text-white text-sm mb-1">Select Token</label>
//         <div className="relative">
//           <select
//             value={primaryToken}
//             onChange={e => setPrimaryToken(e.target.value)}
//             className="w-full bg-transparent border border-white rounded-lg px-4 py-3 text-white placeholder-white appearance-none focus:outline-none"
//           >
//             {tokens.map(t => (
//               <option
//                 key={t.value}
//                 value={t.value}
//                 disabled={!t.value}
//                 className="bg-[#0B0D3A] text-white"
//               >
//                 {t.label}
//               </option>
//             ))}
//           </select>
//           <span className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
//             <svg
//               className="w-5 h-5 text-white"
//               fill="none"
//               stroke="currentColor"
//               viewBox="0 0 24 24"
//             >
//               <path
//                 strokeLinecap="round"
//                 strokeLinejoin="round"
//                 strokeWidth={2}
//                 d="M19 9l-7 7-7-7"
//               />
//             </svg>
//           </span>
//         </div>
//       </div>

//       {/* Amount Input */}
//       <div>
//         <label className="block text-white text-sm mb-1">Enter Amount</label>
//         <input
//           type="number"
//           value={amount}
//           onChange={e => setAmount(e.target.value)}
//           placeholder="Enter amount"
//           className="w-full bg-transparent border border-white rounded-lg px-4 py-3 text-white placeholder-white focus:outline-none"
//         />
//       </div>

//       {/* Optional Token Textarea */}
//       <div>
//         <label className="block text-white text-sm mb-1">Select Token</label>
//         <textarea
//           value={optionalToken}
//           onChange={e => setOptionalToken(e.target.value)}
//           placeholder="Select Token (optional)"
//           rows={3}
//           className="w-full bg-transparent border border-white rounded-lg px-4 py-3 text-white placeholder-white focus:outline-none resize-none"
//         />
//       </div>

//       {/* Preview Card */}
//       <div className="relative mt-4">
//         <div className="w-full h-40 bg-gradient-to-tr from-[#3E236A] to-[#582FA1] rounded-lg flex items-center justify-center overflow-hidden">
//           {/* Replace src with your dynamic preview or logo */}
//           <img src="/lisk-logo-white.svg" alt="Lisk" className="absolute top-4 left-4 w-12 h-12" />
//           <svg
//             className="absolute inset-0 w-full h-full"
//             fill="none"
//             stroke="currentColor"
//             viewBox="0 0 200 100"
//           >
//             {/* example zig-zag graph */}
//             <polyline
//               points="0,80 40,50 80,70 120,40 160,60 200,30"
//               className="stroke-orange-400"
//               strokeWidth="2"
//             />
//             <polyline
//               points="0,70 40,40 80,60 120,30 160,50 200,20"
//               className="stroke-green-400"
//               strokeWidth="2"
//             />
//           </svg>
//         </div>
//         <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 bg-green-400 text-black rounded-full px-4 py-2 flex items-center space-x-2 shadow-lg">
//           <span className="text-sm font-medium">MM/DD/YYYY HH:MM</span>
//           <CalendarIcon className="w-5 h-5" />
//         </div>
//       </div>

//       {/* Action Button */}
//       <button
//         type="button"
//         className="w-full bg-purple-600 hover:bg-purple-500 text-white font-medium py-3 rounded-lg transition"
//       >
//         Create Gift Card
//       </button>
//     </div>
//   );
// };
