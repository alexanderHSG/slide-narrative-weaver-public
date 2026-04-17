import { useState } from 'react';
import { Download } from 'lucide-react';
import HelpModal from './HelpModal';
import Logo from './Logo';
import MenuTabs from './MenuTabs';
import ProfileMenu from '../ProfileMenu/ProfileMenu';

const TopNav = ({ onExport, selectedCount = 0, activeMenu, setActiveMenu, setShouldOpenGraphTutorial }) => {
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const handleLogout = () => {
    setHasConsented(false);
    setShowProfileMenu(false);
    setIsAuthenticated(false);
    setShowLogin(true);
  };

  return (
    <nav className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-6 py-3 bg-white border-b">
      <div className="justify-self-start">
        <MenuTabs
          activeMenu={activeMenu}
          setActiveMenu={setActiveMenu}
          onHelp={() => setShowHelpModal(true)}
          onProfile={() => setShowProfileMenu(true)}
        />
      </div>

      <div className="justify-self-center">
        <Logo />
      </div>

      <div className="justify-self-end flex items-center gap-4">
        <button
          onClick={onExport}
          data-export-button
          className="export-btn px-4 py-2 bg-green-700 text-white rounded-lg inline-flex items-center gap-2 hover:bg-green-800 transition-colors"
        >
          <Download size={16} />
          <span>Export Selected Slides</span>
        </button>
      </div>

      {showHelpModal && (
        <HelpModal
          setShouldOpenGraphTutorial={setShouldOpenGraphTutorial}
          onClose={() => setShowHelpModal(false)}
        />
      )}
      {showProfileMenu && (
        <ProfileMenu
          onClose={() => setShowProfileMenu(false)}
          onLogout={handleLogout}
        />
      )}
    </nav>
  );
};

export default TopNav;
