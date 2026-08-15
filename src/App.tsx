import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { Navbar } from '@/components/common/Navbar';
import { BottomNav } from '@/components/common/BottomNav';
import { EmailVerificationBanner } from '@/components/common/EmailVerificationBanner';
import { InstallPrompt } from '@/components/common/InstallPrompt';
import { Analytics } from '@vercel/analytics/react';
import { ProtectedRoute } from '@/components/common/ProtectedRoute';
import { HomePage } from '@/pages/HomePage';
import { MatchesPage } from '@/pages/MatchesPage';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { LeaderboardPage } from '@/pages/LeaderboardPage';
import { ChatPage } from '@/pages/ChatPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { PlayerProfilePage } from '@/pages/PlayerProfilePage';
import { AllPredictionsPage } from '@/pages/AllPredictionsPage';
import { BadgesPage } from '@/pages/BadgesPage';
import { LeaguesPage } from '@/pages/LeaguesPage';
import { LeaguePage } from '@/pages/LeaguePage';
import { AdminPage } from '@/pages/AdminPage';
import { PrivacyPolicyPage } from '@/pages/PrivacyPolicyPage';
import { ContactPage } from '@/pages/ContactPage';
import { HowToPlayPage } from '@/pages/HowToPlayPage';
import { DuelsPage } from '@/pages/DuelsPage';
import { CreateDuelPage } from '@/pages/CreateDuelPage';
import { DuelDetailPage } from '@/pages/DuelDetailPage';
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
                <Route path="/maclar" element={<MatchesPage />} />
                <Route path="/giris" element={<LoginPage />} />
                <Route path="/kayit" element={<RegisterPage />} />
                <Route path="/liderlik" element={<LeaderboardPage />} />
                <Route path="/sohbet" element={<ChatPage />} />
                <Route path="/oyuncu/:uid" element={<PlayerProfilePage />} />
                <Route path="/oyuncu/:uid/rozetler" element={<BadgesPage />} />
                <Route path="/gizlilik" element={<PrivacyPolicyPage />} />
                <Route path="/iletisim" element={<ContactPage />} />
                <Route path="/nasil-oynanir" element={<HowToPlayPage />} />
                <Route
                  path="/duello"
                  element={
                    <ProtectedRoute>
                      <DuelsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/duello/yeni"
                  element={
                    <ProtectedRoute>
                      <CreateDuelPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/duello/:duelId"
                  element={
                    <ProtectedRoute>
                      <DuelDetailPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/ligler"
                  element={
                    <ProtectedRoute>
                      <LeaguesPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/lig/:leagueId"
                  element={
                    <ProtectedRoute>
                      <LeaguePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profil"
                  element={
                    <ProtectedRoute>
                      <ProfilePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/tahminlerim"
                  element={
                    <ProtectedRoute>
                      <AllPredictionsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/rozetler"
                  element={
                    <ProtectedRoute>
                      <BadgesPage />
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
            <InstallPrompt />
            <Analytics />
          </div>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
