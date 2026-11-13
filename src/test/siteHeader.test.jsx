import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

/**
 * The header changes with who is looking (guest or signed in) and with screen
 * width (a row of links, or a Menu button on phones). These pin both down.
 */

const auth = {
  isRegistered: true,
  isGuest: false,
  displayName: 'Repson2',
  logout: vi.fn(() => Promise.resolve()),
  needsEmailVerification: false,
};
let mobile = false;

vi.mock('@/context/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('@/lib/useMediaQuery', () => ({
  useIsMobile: () => mobile,
  useMediaQuery: () => mobile,
}));

const { default: SiteHeader } = await import('@/components/wf/SiteHeader');

function renderHeader(props = {}) {
  render(
    <MemoryRouter>
      <SiteHeader {...props} />
    </MemoryRouter>
  );
}

describe('SiteHeader', () => {
  beforeEach(() => {
    mobile = false;
    Object.assign(auth, { isRegistered: true, isGuest: false, displayName: 'Repson2' });
  });

  it('gives a signed-in player their account links', () => {
    renderHeader();
    expect(screen.getByText('Repson2')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Game History' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Account Settings' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign Out' })).toBeInTheDocument();
  });

  it('marks the current page', () => {
    renderHeader({ current: 'history' });
    expect(screen.getByRole('link', { name: 'Game History' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Account Settings' })).not.toHaveAttribute('aria-current');
  });

  it('gives a guest the way to sign up instead', () => {
    Object.assign(auth, { isRegistered: false, isGuest: true });
    renderHeader();
    expect(screen.getByText('Playing as guest')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign Up' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Login' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Game History' })).not.toBeInTheDocument();
  });

  it('folds the links into a menu on phones, which opens and closes', () => {
    mobile = true;
    renderHeader();

    expect(screen.queryByRole('link', { name: /Game History/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    expect(screen.getByRole('dialog', { name: 'Menu' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Game History/ })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Menu' })).not.toBeInTheDocument();
  });

  it('puts a guest\'s two links straight in the bar on phones, with no menu', () => {
    mobile = true;
    Object.assign(auth, { isRegistered: false, isGuest: true });
    renderHeader();
    expect(screen.queryByRole('button', { name: 'Open menu' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Login' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign Up' })).toBeInTheDocument();
  });

  it('offers a sound switch', () => {
    renderHeader();
    const toggle = screen.getByRole('button', { name: /sound/i });
    const before = toggle.getAttribute('aria-pressed');
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-pressed')).not.toBe(before);
  });
});
