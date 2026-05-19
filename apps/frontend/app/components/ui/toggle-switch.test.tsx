import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

import { ToggleSwitch } from './toggle-switch';

// @base-ui/react Switch: the root renders a <button role="switch">.
// The Thumb is a decorative span — not independently testable here.

describe('ToggleSwitch', () => {
  it('renders an accessible switch element', () => {
    render(
      <ToggleSwitch checked={false} onCheckedChange={() => {}} aria-label="Enable notifications" />,
    );
    const switchEl = screen.getByRole('switch', { name: 'Enable notifications' });
    expect(switchEl, 'switch element must be in the document').toBeInTheDocument();
  });

  it('reflects checked=false with aria-checked="false"', () => {
    render(<ToggleSwitch checked={false} onCheckedChange={() => {}} aria-label="Toggle" />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
  });

  it('reflects checked=true with aria-checked="true"', () => {
    render(<ToggleSwitch checked={true} onCheckedChange={() => {}} aria-label="Toggle" />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  });

  it('calls onCheckedChange when clicked', async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(<ToggleSwitch checked={false} onCheckedChange={onCheckedChange} aria-label="Toggle" />);

    await user.click(screen.getByRole('switch'));

    expect(onCheckedChange, 'onCheckedChange must be called on click').toHaveBeenCalledTimes(1);
    expect(onCheckedChange).toHaveBeenCalledWith(true, expect.anything());
  });

  it('calls onCheckedChange with false when currently checked and clicked', async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(<ToggleSwitch checked={true} onCheckedChange={onCheckedChange} aria-label="Toggle" />);

    await user.click(screen.getByRole('switch'));

    expect(onCheckedChange).toHaveBeenCalledWith(false, expect.anything());
  });

  it('is keyboard-activatable via Space', async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(<ToggleSwitch checked={false} onCheckedChange={onCheckedChange} aria-label="Toggle" />);

    screen.getByRole('switch').focus();
    await user.keyboard(' ');

    expect(onCheckedChange, 'Space key must activate the switch').toHaveBeenCalledTimes(1);
  });

  it('does not call onCheckedChange when disabled', async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(
      <ToggleSwitch
        checked={false}
        onCheckedChange={onCheckedChange}
        disabled
        aria-label="Toggle"
      />,
    );

    await user.click(screen.getByRole('switch'));

    expect(onCheckedChange, 'disabled switch must not fire onCheckedChange').not.toHaveBeenCalled();
  });

  it('passes through id and aria-label', () => {
    render(
      <ToggleSwitch
        id="my-switch"
        checked={false}
        onCheckedChange={() => {}}
        aria-label="Custom label"
      />,
    );
    const switchEl = screen.getByRole('switch');
    // @base-ui/react generates its own internal id — the id prop is not forwarded
    // to the rendered button's HTML id attribute.
    expect(switchEl).toHaveAttribute('aria-label', 'Custom label');
  });
});
