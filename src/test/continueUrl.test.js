import { describe, it, expect } from 'vitest';
import { safeContinue } from '@/lib/continueUrl';

/**
 * The continue URL arrives on the query string of a link in an email, which
 * means it is attacker-supplied in the only way that matters: anyone can send
 * someone a link. If the handler followed it blindly, a BibleoGuessr email link
 * could deposit a player on someone else's site still believing they were here.
 *
 * jsdom serves these from http://localhost:3000, which stands in for the real
 * origin.
 */
describe('safeContinue', () => {
  const here = window.location.origin;

  it('falls back when there is no continue URL', () => {
    expect(safeContinue(null, '/login')).toBe('/login');
    expect(safeContinue('', '/login')).toBe('/login');
    expect(safeContinue(undefined, '/login')).toBe('/login');
  });

  it('defaults the fallback to /home', () => {
    expect(safeContinue(null)).toBe('/home');
  });

  it('keeps a same-origin absolute URL, returned as a relative path', () => {
    expect(safeContinue(`${here}/home`, '/login')).toBe('/home');
    expect(safeContinue(`${here}/game/abc?round=2`, '/login')).toBe('/game/abc?round=2');
    expect(safeContinue(`${here}/home#top`, '/login')).toBe('/home#top');
  });

  it('accepts a relative path, which can only resolve to this origin', () => {
    expect(safeContinue('/settings', '/login')).toBe('/settings');
  });

  it('rejects a different origin', () => {
    expect(safeContinue('https://evil.example/steal', '/login')).toBe('/login');
    expect(safeContinue('http://localhost:9999/other', '/login')).toBe('/login');
  });

  it('rejects a protocol-relative URL, which is a different origin in disguise', () => {
    expect(safeContinue('//evil.example/steal', '/login')).toBe('/login');
  });

  it('rejects a javascript: URL', () => {
    expect(safeContinue('javascript:alert(1)', '/login')).toBe('/login');
  });

  it('rejects a host that merely starts with ours', () => {
    expect(safeContinue('https://localhost:3000.evil.example/x', '/login')).toBe('/login');
  });

  it('falls back rather than throwing on a malformed value', () => {
    expect(safeContinue('http://[', '/login')).toBe('/login');
  });
});
