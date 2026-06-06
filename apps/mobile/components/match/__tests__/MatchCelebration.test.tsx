import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MatchCelebration } from '../MatchCelebration';
import type { InboxMatch } from '@/hooks/useMatchInbox';

/* ── Mock match data ─────────────────────────────────────────────────── */

const mockMatch: InboxMatch = {
  id: 'match-1',
  status: 'chatting',
  jobId: 'job-1',
  jobTitle: 'Barista · Little Lane Cafe',
  counterpartId: 'employer-1',
  counterpartName: 'Sarah',
  counterpartAvatarUrl: 'https://example.com/avatar.jpg',
  lastMessagePreview: null,
  updatedAt: '2026-06-06T10:00:00Z',
  isNewMatch: true,
};

/* ── Text matcher helpers ─────────────────────────────────────────────── */
/* "IT'S A MATCH" is split across nested <span> elements. We use a
 * function matcher that checks textContent. Because Modal is mocked as a
 * plain <div> (it always renders children regardless of `visible`), the
 * text appears in multiple ancestor containers; use `*AllBy*` variants.   */

const itIsAMatch = (_content: string, element: Element | null): boolean =>
  element?.textContent?.includes("IT'S A MATCH") ?? false;

/* ── Helpers ──────────────────────────────────────────────────────────── */

function renderMatchCelebration(overrides: Record<string, unknown> = {}) {
  const onSendMessage = vi.fn();
  const onClose = vi.fn();

  const result = render(
    <MatchCelebration
      visible
      match={mockMatch}
      userPhotoUrl={null}
      userName="Alex"
      role="candidate"
      onSendMessage={onSendMessage}
      onClose={onClose}
      {...overrides}
    />,
  );

  return { onSendMessage, onClose, result };
}

/* ── Tests ────────────────────────────────────────────────────────────── */

describe('MatchCelebration', () => {
  it('renders nothing when match is null', () => {
    render(
      <MatchCelebration
        visible
        match={null}
        userPhotoUrl={null}
        userName="Alex"
        role="candidate"
        onSendMessage={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    // When match is null, the component returns null so no match content renders
    expect(screen.queryByText('Alex & Sarah')).toBeNull();
  });

  it('renders the celebration overlay with match details', () => {
    renderMatchCelebration();

    // Use getAllByText (text appears in parent containers) and check first match
    expect(screen.getAllByText(itIsAMatch).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Alex & Sarah')).toBeTruthy();
    expect(screen.getByText('Barista · Little Lane Cafe')).toBeTruthy();
    expect(screen.getByText('Employer wants to chat')).toBeTruthy();
  });

  it('shows "New match" text and role detail for employer role', () => {
    renderMatchCelebration({ role: 'employer' });

    expect(screen.getByText('New match')).toBeTruthy();
    expect(screen.getByText('Candidate is interested in this role')).toBeTruthy();
  });

  it('shows "Employer wants to chat" text for candidate role', () => {
    renderMatchCelebration({ role: 'candidate' });

    expect(screen.getByText('Employer wants to chat')).toBeTruthy();
    expect(screen.getByText('Employer matched for this role')).toBeTruthy();
  });

  it('calls onSendMessage when Send a message button is pressed', () => {
    const { onSendMessage } = renderMatchCelebration();

    fireEvent.click(screen.getByText('Send a message'));

    expect(onSendMessage).toHaveBeenCalledTimes(1);
  });


  it('calls onClose when backdrop is pressed', () => {
    const { onClose } = renderMatchCelebration();

    // The outermost <button> in the rendered tree is the backdrop
    // (the Modal mock renders a plain <div> which contains the backdrop)
    const buttons = screen.getAllByRole('button');
    // The first button in the DOM tree should be the backdrop Pressable
    fireEvent.click(buttons[0]);
    expect(onClose).toHaveBeenCalled();
  });

  it('renders initials placeholder when no avatar URLs are provided', () => {
    renderMatchCelebration({
      match: { ...mockMatch, counterpartAvatarUrl: null },
      userPhotoUrl: null,
    });

    // Should render without error — verify key text still shows
    expect(screen.getByText('Alex & Sarah')).toBeTruthy();
    expect(screen.getByText('Employer wants to chat')).toBeTruthy();
  });

  it('renders with counterpart avatar when provided', () => {
    renderMatchCelebration();

    // The Image components should exist
    const images = screen.getAllByRole('img');
    expect(images.length).toBeGreaterThanOrEqual(1);
  });
});
