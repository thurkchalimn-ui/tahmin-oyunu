import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { Navbar } from '@/components/common/Navbar';
import { BottomNav } from '@/components/common/BottomNav';
import { EmailVerificationBanner } from '@/components/common/EmailVerificationBanner';
import { ProtectedRoute } from '@/components/common/ProtectedRoute';
import { HomePage } from '@/pages/HomePage';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { LeaderboardPage } from '@/pages/LeaderboardPage';
import { ChatPage } from '@/pages/ChatPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { PlayerProfilePage } from '@/pages/PlayerProfilePage';
import { AdminPage } from '@/pages/AdminPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

/** Uygulamanın kök bileşeni: provider'ları kurar ve rota tablosunu tanımlar. */
export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <div className="min-h-screen bg-pitch-100 dark:bg-pitch-900">
            <Navbar />
            <EmailVerificationBanner />
            <main className="pb-16">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/giris" element={<LoginPage />} />
                <Route path="/kayit" element={<RegisterPage />} />
                <Route path="/liderlik" element={<LeaderboardPage />} />
                <Route path="/sohbet" element={<ChatPage />} />
                <Route path="/oyuncu/:uid" element={<PlayerProfilePage />} />
                <Route
                  path="/profil"
                  element={
                    <ProtectedRoute>
                      <ProfilePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute requireAdmin>
                      <AdminPage />
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </main>
            <BottomNav />
          </div>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
