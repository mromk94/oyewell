import { Routes, Route, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import FoodDetail from './pages/FoodDetail';
import TrackOrder from './pages/TrackOrder';
import Rider from './pages/Rider';
import Cook from './pages/Cook';
import CookListingDetail from './pages/CookListingDetail';
import Admin from './pages/Admin';
import Login from './pages/Login';
import Register from './pages/Register';
import Account from './pages/Account';
import CartButton from './components/CartButton';
import CartModal from './components/CartModal';
import AccountButton from './components/AccountButton';
import AuthModal from './components/AuthModal';
import InstallPrompt from './components/InstallPrompt';
import NotificationListener from './components/NotificationListener';

function App() {
  const location = useLocation();
  const isAdmin = location.pathname === '/admin';

  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/food/:slug" element={<FoodDetail />} />
        <Route path="/track/:orderNumber" element={<TrackOrder />} />
        <Route path="/rider" element={<Rider />} />
        <Route path="/cook" element={<Cook />} />
        <Route path="/cook-listing/:id" element={<CookListingDetail />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/account" element={<Account />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
      {!isAdmin && <CartButton />}
      {!isAdmin && <CartModal />}
      {!isAdmin && <AccountButton />}
      {!isAdmin && <AuthModal />}
      <InstallPrompt />
      <NotificationListener />
    </>
  );
}

export default App;
