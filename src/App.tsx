import { Routes, Route } from 'react-router-dom'
import { LockerProvider } from './state/LockerContext'
import { AppLayout } from './components/AppLayout'
import HomePage from './pages/HomePage'
import ItemDetailPage from './pages/ItemDetailPage'
import RankingPage from './pages/RankingPage'
import NotificationsPage from './pages/NotificationsPage'
import FeedPage from './pages/FeedPage'
import FamilyPage from './pages/FamilyPage'
import NewItemPage from './pages/NewItemPage'
import CollectionPage from './pages/CollectionPage'

export default function App() {
  return (
    <LockerProvider>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/item/:id" element={<ItemDetailPage />} />
          <Route path="/ranking" element={<RankingPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/feed" element={<FeedPage />} />
          <Route path="/family" element={<FamilyPage />} />
          <Route path="/new" element={<NewItemPage />} />
          <Route path="/collection" element={<CollectionPage />} />
        </Route>
      </Routes>
    </LockerProvider>
  )
}
