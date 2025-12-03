import { render, screen, fireEvent } from '@testing-library/react';
import { PageTabs } from '@/components/PageTabs';
import type { Page } from '@/types/change';

const mockPages: Page[] = [
  {
    id: 'page-1',
    name: 'Page 1',
    imageData: 'data:image/png;base64,test1',
    imageWidth: 800,
    imageHeight: 600,
    changes: [],
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 'page-2',
    name: 'Page 2',
    imageData: 'data:image/png;base64,test2',
    imageWidth: 800,
    imageHeight: 600,
    changes: [],
    createdAt: new Date('2024-01-02'),
  },
];

describe('PageTabs', () => {
  const mockOnSelectPage = jest.fn();
  const mockOnDeletePage = jest.fn();
  const mockOnAddPage = jest.fn();

  const defaultProps = {
    pages: mockPages,
    currentPageIndex: 0,
    onSelectPage: mockOnSelectPage,
    onDeletePage: mockOnDeletePage,
    onAddPage: mockOnAddPage,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render all page tabs', () => {
    render(<PageTabs {...defaultProps} />);

    expect(screen.getByText('Page 1')).toBeInTheDocument();
    expect(screen.getByText('Page 2')).toBeInTheDocument();
  });

  it('should highlight current page tab', () => {
    render(<PageTabs {...defaultProps} currentPageIndex={0} />);

    const firstTab = screen.getByText('Page 1').closest('button');
    expect(firstTab).toHaveClass('bg-blue-500');
  });

  it('should call onSelectPage when tab clicked', () => {
    render(<PageTabs {...defaultProps} />);

    fireEvent.click(screen.getByText('Page 2'));

    expect(mockOnSelectPage).toHaveBeenCalledWith(1);
  });

  it('should show delete button for each tab', () => {
    render(<PageTabs {...defaultProps} />);

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    expect(deleteButtons).toHaveLength(2);
  });

  it('should call onDeletePage when delete button clicked', () => {
    render(<PageTabs {...defaultProps} />);

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    fireEvent.click(deleteButtons[0]);

    expect(mockOnDeletePage).toHaveBeenCalledWith('page-1');
  });

  it('should not propagate click to tab when delete clicked', () => {
    render(<PageTabs {...defaultProps} />);

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    fireEvent.click(deleteButtons[0]);

    expect(mockOnSelectPage).not.toHaveBeenCalled();
  });

  it('should show add button when no pages', () => {
    render(<PageTabs {...defaultProps} pages={[]} />);

    expect(screen.getByTitle('Add page')).toBeInTheDocument();
  });

  it('should call onAddPage when add button clicked', () => {
    render(<PageTabs {...defaultProps} />);

    fireEvent.click(screen.getByTitle('Add page'));

    expect(mockOnAddPage).toHaveBeenCalled();
  });

  it('should show page count indicator', () => {
    render(<PageTabs {...defaultProps} />);

    expect(screen.getByText(/2 pages/i)).toBeInTheDocument();
  });

  it('should handle single page', () => {
    render(<PageTabs {...defaultProps} pages={[mockPages[0]]} />);

    expect(screen.getByText('Page 1')).toBeInTheDocument();
    expect(screen.getByText(/1 page/i)).toBeInTheDocument();
  });
});
