import { useState, useEffect } from 'react';
import { MainLayout } from './components/layout/MainLayout';
import type { TabType } from './components/layout/Sidebar';

import { InventoryView } from './views/InventoryView';
import { DashboardView } from './views/DashboardView';
import { ClientTotemView } from './views/ClientTotemView';
import { useMarketStore } from './store/useMarketStore';

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const { activeInstance, initData } = useMarketStore();

  useEffect(() => {
    initData();
  }, [initData]);

  if (activeInstance === 'client') {
    return <ClientTotemView />;
  }

  return (
    <MainLayout activeTab={activeTab} onTabChange={setActiveTab}>

      {activeTab === 'inventory' && <InventoryView />}
      {activeTab === 'dashboard' && <DashboardView />}
    </MainLayout>
  );
}

export default App;
