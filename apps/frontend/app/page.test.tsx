import { render, screen } from '@testing-library/react';
import Home from './page';

describe('Home page', () => {
  it('renders the app name', () => {
    render(<Home />);
    expect(screen.getByRole('heading', { name: /pillyway/i })).toBeInTheDocument();
  });
});
