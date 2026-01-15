import { useState } from 'react';
import AdminPanel from "../AdminPanel/AdminPanel";

const tabs = [
  { key: 'board', label: 'Board', className: 'board-menu' },
  { key: 'view',  label: 'View',  className: 'view-menu'  },
];

const MenuTabs = ({ activeMenu, setActiveMenu, onHelp, onProfile }) => {
  const [adminOpen, setAdminOpen] = useState(false);

  return (
    <div className="flex items-center space-x-8">
      {tabs.map(tab => (
        <button
          key={tab.key}
          onClick={() => setActiveMenu(tab.key)}
          className={`${activeMenu === tab.key
              ? 'text-green-700 border-b-2 border-green-700'
              : 'text-gray-600 hover:text-green-700'
            } cursor-pointer px-2 py-1 ${tab.className}`}
        >
          {tab.label}
        </button>
      ))}

      <button onClick={onHelp} className="help-menu text-gray-600 hover:text-green-700 cursor-pointer px-2 py-1">
        Help
      </button>

      <button onClick={onProfile} className="profile-menu text-gray-600 hover:text-green-700 cursor-pointer px-2 py-1">
        Profile
      </button>

      <AdminPanel />
    </div>
  );
};

export default MenuTabs;
