import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { RequireSession, RequireAccount, RedirectIfSignedIn } from '@/components/RouteGuards';
import { WfFullPageSpinner } from '@/components/wf/PageShell';
import { GameProvider } from '@/context/GameContext';

import Landing from '@/pages/Landing';
import ForgotPassword from '@/pages/ForgotPassword';
import AuthAction from '@/pages/AuthAction';
import NotFound from '@/pages/NotFound';
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
const Privacy = lazy(() => import('@/pages/legal/Privacy'));
const Terms = lazy(() => import('@/pages/legal/Terms'));
const History = lazy(() => import('@/pages/History'));
const Browse = lazy(() => import('@/pages/Browse'));

export default function App() {
  return (
    <Suspense fallback={<WfFullPageSpinner label="Loading" />}>
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
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Where Firebase's email links land. Set as the action URL on every
            template, so the links stay on this domain instead of needing a page
            served by Firebase Hosting — which nothing here is. Must be
            reachable signed out: a reset link is opened by someone locked out,
            often on another device. */}
        <Route path="/auth/action" element={<AuthAction />} />

        {/* Reachable signed out: a visitor must be able to read these before
            deciding whether to hand over an email address. */}
        <Route path="/legal/privacy" element={<Privacy />} />
        <Route path="/legal/terms" element={<Terms />} />

        <Route
          path="/home"
          element={
            <RequireSession>
              <Home />
            </RequireSession>
          }
        />
        {/* Browsing: open to guests too, since it costs nothing and saves nothing. */}
        <Route
          path="/browse"
          element={
            <RequireSession>
              <Browse />
            </RequireSession>
          }
        />
        <Route
          path="/practice/setup"
          element={
            <RequireSession>
              <PlaySetup practice />
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

        {/* A real 404 rather than a silent redirect, so a mistyped or dead
            link is visibly wrong instead of looking like a logout. */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
