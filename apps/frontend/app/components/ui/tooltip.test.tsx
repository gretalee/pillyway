import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';

import { Tooltip } from './tooltip';

// @base-ui/react Tooltip: the trigger renders as a <button> (or spans its child
// when render=false), and the popup is portalled into the document body when
// the trigger is hovered / focused.

describe('Tooltip', () => {
  it('renders children inside the trigger', () => {
    render(<Tooltip content="Tooltip text">Help icon</Tooltip>);
    expect(screen.getByText('Help icon'), 'trigger children must be rendered').toBeInTheDocument();
  });

  it('applies aria-label to the trigger element', () => {
    render(
      <Tooltip content="Tooltip text" aria-label="Open help">
        <span>?</span>
      </Tooltip>,
    );
    // The trigger button receives the aria-label prop.
    const trigger = screen.getByLabelText('Open help');
    expect(trigger, 'trigger must be findable by its aria-label').toBeInTheDocument();
  });

  it('does not show tooltip popup before interaction', () => {
    render(<Tooltip content="Hidden until hover">Trigger</Tooltip>);
    // The popup content should not yet be visible in the DOM (portal not mounted
    // or hidden until hover/focus).
    expect(screen.queryByText('Hidden until hover')).not.toBeInTheDocument();
  });

  it('shows tooltip content after the trigger is focused', async () => {
    const user = userEvent.setup();
    render(
      <Tooltip content="Focus tooltip content" aria-label="Focus me">
        <span>icon</span>
      </Tooltip>,
    );

    const trigger = screen.getByLabelText('Focus me');
    await user.tab(); // move focus onto the trigger
    // After focus the popup should appear in the portal.
    const popup = await screen.findByText('Focus tooltip content');
    expect(popup, 'tooltip content must appear after the trigger receives focus').toBeInTheDocument();
  });

  it('applies triggerClassName to the trigger wrapper', () => {
    render(
      <Tooltip content="Text" aria-label="tt" triggerClassName="custom-class">
        icon
      </Tooltip>,
    );
    const trigger = screen.getByLabelText('tt');
    expect(trigger.className, 'triggerClassName must be applied').toContain('custom-class');
  });
});
