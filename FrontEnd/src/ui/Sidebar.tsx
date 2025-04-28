// src/components/Sidebar.tsx
import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Gift, CheckCircle, ShieldCheck, PlusCircle, Menu, X } from 'lucide-react';

const Sidebar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false); // Sidebar open/closed state

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: Home },
    { path: '/create-gift', label: 'Create Gift', icon: PlusCircle },
    { path: '/claim-gift', label: 'Claim Gift', icon: CheckCircle },
    { path: '/validateGift', label: 'Validate Gift', icon: ShieldCheck },
    { path: '/reclaimGift', label: 'Reclaim Gift', icon: Gift },
  ];

  const toggleSidebar = () => setIsOpen(!isOpen);

  return (
    <>
      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full bg-indigo-950/90 backdrop-blur-md border-r border-indigo-800/50 transition-all duration-300 ease-in-out z-40
          ${isOpen ? 'w-52' : 'w-16'}`}
      >
        <div className="flex flex-col h-full">
          {/* Toggle Button */}
          <div className="p-4 flex items-center justify-between">
            {isOpen && (
              <h2 className="text-white font-bold text-lg">GiftChain</h2>
            )}
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-lg text-white hover:bg-indigo-800/50"
              aria-label={isOpen ? 'Close sidebar' : 'Open sidebar'}
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 mt-4">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center p-4 text-indigo-200 hover:bg-indigo-800/50 hover:text-white transition
                  ${isActive ? 'bg-indigo-700/70 text-white' : ''}`
                }
                onClick={() => setIsOpen(false)} // Close sidebar on link click (mobile)
              >
                <item.icon size={24} className="min-w-[24px]" />
                <span className={`ml-4 ${isOpen ? 'block' : 'hidden'}`}>
                  {item.label}
                </span>
              </NavLink>
            ))}
          </nav>
        </div>
      </div>

      {/* Overlay for mobile when sidebar is open */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-30"
          onClick={toggleSidebar}
        />
      )}
    </>
  );
};

export default Sidebar;