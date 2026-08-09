import { Routes, Route, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import FoodDetail from './pages/FoodDetail';
import TrackOrder from './pages/TrackOrder';
import Admin from './pages/Admin';
import Login from './pages/Login';
import Register from './pages/Register';
import Account from './pages/Account';
import CartButton from './components/CartButton';
import CartModal from './components/CartModal';
import AccountButton from './components/AccountButton';
import AuthModal from './components/AuthModal';
import InstallPrompt from './components/InstallPrompt';

function App() {
  const location = useLocation();
  const isAdmin = location.pathname === '/admin';

  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/food/:slug" element={<FoodDetail />} />
        <Route path="/track/:orderNumber" element={<TrackOrder />} />
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
    </>
  );
}

export default App;
