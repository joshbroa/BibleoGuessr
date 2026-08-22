import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { RequireSession, RequireAccount, RedirectIfSignedIn } from '@/components/RouteGuards';
import { FullPageSpinner } from '@/components/Spinner';
import { GameProvider } from '@/context/GameContext';

import Landing from '@/pages/Landing';
import Login from '@/pages/Login';
import SignUp from '@/pages/SignUp';
import Home from '@/pages/Home';
import PlaySetup from '@/pages/PlaySetup';

// The game screens pull in three.js, drei and gsap. Splitting them out keeps
// the landing and auth pages light for a first-time visitor.
const Game = lazy(() => import('@/pages/Game'));
const RoundResult = lazy(() => import('@/pages/RoundResult'));
const Summary = lazy(() => import('@/pages/Summary'));
const Settings = lazy(() => import('@/pages/Settings'));
const History = lazy(() => import('@/pages/History'));

export default function App() {
  return (
    <Suspense fallback={<FullPageSpinner label="Loading" />}>
      <Routes>
        <Route
          path="/"
          element={
            <RedirectIfSignedIn>
              <Landing />
            </RedirectIfSignedIn>
          }
        />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />

        <Route
          path="/home"
          element={
            <RequireSession>
              <Home />
            </RequireSession>
          }
        />
        <Route
          path="/play/setup"
          element={
            <RequireSession>
              <PlaySetup />
            </RequireSession>
          }
        />

        {/* All three game screens share one GameProvider so round state, the
            page cache and the guess survive navigation between them. */}
        <Route
          path="/game/:gameId"
          element={
            <RequireSession>
              <GameProvider />
            </RequireSession>
          }
        >
          <Route index element={<Game />} />
          <Route path="round-result" element={<RoundResult />} />
          <Route path="summary" element={<Summary />} />
        </Route>

        <Route
          path="/settings"
          element={
            <RequireAccount>
              <Settings />
            </RequireAccount>
          }
        />
        <Route
          path="/history"
          element={
            <RequireAccount>
              <History />
            </RequireAccount>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
