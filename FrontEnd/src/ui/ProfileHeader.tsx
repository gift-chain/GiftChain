import { Bell, User, Menu } from "lucide-react";

const ProfileHeader = () => {
  return (
    <div className="flex justify-between items-center text-white w-full relative">
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
        {/* <Menu className="w-6 h-6 cursor-pointer hover:text-white" /> */}
      </div>
    </div>
  );
};

export default ProfileHeader;