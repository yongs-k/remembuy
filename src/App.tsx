import { Routes, Route } from 'react-router-dom'
import { LockerProvider } from './state/LockerContext'
import { GameProvider } from './state/GameContext'
import { AppLayout } from './components/AppLayout'
import HomePage from './pages/HomePage'
import ItemDetailPage from './pages/ItemDetailPage'
import RankingPage from './pages/RankingPage'
import NotificationsPage from './pages/NotificationsPage'
import PurchasePage from './pages/PurchasePage'
import NewItemPage from './pages/NewItemPage'
import CollectionPage from './pages/CollectionPage'
import StorePage from './pages/StorePage'
import DexPage from './pages/DexPage'
import AdminPage from './pages/AdminPage'
import SettingsPage from './pages/SettingsPage'
import QuestsPage from './pages/QuestsPage'

export default function App() {
  return (
    <LockerProvider>
      <GameProvider>
      <Routes>
        <Route path="/admin" element={<AdminPage />} />
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/item/:id" element={<ItemDetailPage />} />
          <Route path="/ranking" element={<RankingPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/purchase" element={<PurchasePage />} />
          <Route path="/new" element={<NewItemPage />} />
          <Route path="/collection" element={<CollectionPage />} />
          <Route path="/store" element={<StorePage />} />
          <Route path="/dex" element={<DexPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/quests" element={<QuestsPage />} />
        </Route>
      </Routes>
      </GameProvider>
    </LockerProvider>
  )
}
