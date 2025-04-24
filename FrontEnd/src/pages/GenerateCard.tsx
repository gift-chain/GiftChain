import React, { useState } from 'react';
import giftcard from '../assets/giftcard.png';

export function GenerateCard() {
    const [token, setToken] = useState('');
    const [amount, setAmount] = useState('');
    const [expiry, setExpiry] = useState('');

    return (
        <div className="min-h-screen bg-[#1F1668] flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-[#041259]/40 rounded-xl p-6 shadow-lg">
                <h2 className="text-white text-xl font-semibold mb-6">
                    Create Gift Card
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
                            <option value="" disabled className="text-[#d9d9d9] text-sm opacity-50">
                                Select token
                            </option>
                            <option value="lsk" className="bg-[#101339] text-white">
                                Lisk
                            </option>
                            <option value="eth" className="bg-[#101339] text-white">
                                Ethereum
                            </option>
                            <option value="matic" className="bg-[#101339] text-white">
                                Polygon
                            </option>
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

                {/* Expiration Input */}
                <div className="mb-4">
                    <label className="block text-white text-sm mb-1">
                        Set Expiration
                    </label>
                    <input
                        type="datetime-local"
                        value={expiry}
                        onChange={e => setExpiry(e.target.value)}
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
                        console.log('Creating gift card:', { token, amount });
                    }}
                >
                    Create Gift Card
                </button>

            </div>
        </div>
    );
}