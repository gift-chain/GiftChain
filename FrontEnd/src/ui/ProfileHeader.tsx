import { Bell, User, Menu } from "lucide-react";

const ProfileHeader = () => {
  return (
    <div className="flex justify-between items-center text-white w-full relative">
      {/* Gradient behind user avatar */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-40 h-40 bg-[#9812C2] blur-[100px] opacity-100 z-0" />
      {/* Gradient behind icons */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-40  h-40 bg-[#9812C2] blur-[50px] opacity-100 z-0" />

      <div className="flex items-center gap-4 relative z-10">
        <div>
          <div className="bg-white/10 rounded-full p-3">
            <User className="w-6 h-6 text-white" />
          </div>
        </div>
        <div>
          <p className="text-sm">Welcome,</p>
          <p className="text-lg font-semibold">User</p>
        </div>
      </div>

      <div className="flex items-center gap-6 text-white/80 relative z-10">
        <Bell className="w-5 h-5 cursor-pointer hover:text-white" />
        <Menu className="w-6 h-6 cursor-pointer hover:text-white" />
      </div>
    </div>
  );
};

export default ProfileHeader;
