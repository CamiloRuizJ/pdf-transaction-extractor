import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, user, waitFor } from '../../test/utils';
import { DataTable, Column } from './DataTable';

interface TestData {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'user';
  createdAt: Date;
  active: boolean;
}

const testData: TestData[] = [
  {
    id: 1,
    name: 'John Doe',
    email: 'john@example.com',
    role: 'admin',
    createdAt: new Date('2024-01-01'),
    active: true,
  },
  {
    id: 2,
    name: 'Jane Smith',
    email: 'jane@example.com',
    role: 'user',
    createdAt: new Date('2024-01-15'),
    active: false,
  },
  {
    id: 3,
    name: 'Bob Johnson',
    email: 'bob@example.com',
    role: 'user',
    createdAt: new Date('2024-02-01'),
    active: true,
  },
];

const columns: Column<TestData>[] = [
  {
    key: 'name',
    header: 'Name',
    accessor: 'name',
    sortable: true,
  },
  {
    key: 'email',
    header: 'Email',
    accessor: 'email',
    sortable: true,
  },
  {
    key: 'role',
    header: 'Role',
    accessor: 'role',
    sortable: true,
    render: (value: string) => (
      <span className={value === 'admin' ? 'text-red-600' : 'text-blue-600'}>
        {value}
      </span>
    ),
  },
  {
    key: 'active',
    header: 'Status',
    accessor: 'active',
    render: (value: boolean) => (
      <span className={value ? 'text-green-600' : 'text-gray-600'}>
        {value ? 'Active' : 'Inactive'}
      </span>
    ),
  },
  {
    key: 'actions',
    header: 'Actions',
    accessor: () => null,
    render: (_, item: TestData) => (
      <button onClick={() => console.log('Edit', item.id)}>Edit</button>
    ),
  },
];

describe('DataTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders table with data', () => {
    render(<DataTable data={testData} columns={columns} />);

    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Role')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
  });

  it('renders custom cell content with render function', () => {
    render(<DataTable data={testData} columns={columns} />);

    const adminRole = screen.getByText('admin');
    expect(adminRole).toHaveClass('text-red-600');

    const userRole = screen.getAllByText('user')[0];
    expect(userRole).toHaveClass('text-blue-600');

    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  it('handles empty data', () => {
    render(<DataTable data={[]} columns={columns} />);

    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('shows custom empty message', () => {
    render(<DataTable data={[]} columns={columns} emptyMessage="No users found" />);

    expect(screen.getByText('No users found')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<DataTable data={[]} columns={columns} loading />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('handles row clicks', async () => {
    const onRowClick = vi.fn();
    render(<DataTable data={testData} columns={columns} onRowClick={onRowClick} />);

    const firstRow = screen.getByText('John Doe').closest('tr');
    await user.click(firstRow!);

    expect(onRowClick).toHaveBeenCalledWith(testData[0]);
  });

  it('implements search functionality', async () => {
    render(<DataTable data={testData} columns={columns} searchable />);

    const searchInput = screen.getByPlaceholderText('Search...');
    expect(searchInput).toBeInTheDocument();

    await user.type(searchInput, 'John');

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
      expect(screen.queryByText('Bob Johnson')).not.toBeInTheDocument();
    });
  });

  it('implements sorting functionality', async () => {
    render(<DataTable data={testData} columns={columns} sortable />);

    const nameHeader = screen.getByText('Name');
    await user.click(nameHeader);

    // Should sort ascending first
    const rows = screen.getAllByRole('row');
    expect(rows[1]).toHaveTextContent('Bob Johnson'); // First data row after header
    expect(rows[2]).toHaveTextContent('Jane Smith');
    expect(rows[3]).toHaveTextContent('John Doe');

    // Click again for descending
    await user.click(nameHeader);
    const rowsDesc = screen.getAllByRole('row');
    expect(rowsDesc[1]).toHaveTextContent('John Doe');
    expect(rowsDesc[2]).toHaveTextContent('Jane Smith');
    expect(rowsDesc[3]).toHaveTextContent('Bob Johnson');
  });

  it('shows sort indicators', async () => {
    render(<DataTable data={testData} columns={columns} sortable />);

    const nameHeader = screen.getByText('Name');
    await user.click(nameHeader);

    // Should show ascending indicator
    expect(nameHeader.parentElement).toContainHTML('ChevronUpIcon');

    await user.click(nameHeader);

    // Should show descending indicator
    expect(nameHeader.parentElement).toContainHTML('ChevronDownIcon');
  });

  it('handles selection when selectable is true', async () => {
    const onSelectionChange = vi.fn();
    render(
      <DataTable 
        data={testData} 
        columns={columns} 
        selectable
        onSelectionChange={onSelectionChange}
      />
    );

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(4); // Header + 3 rows

    // Select first row
    await user.click(checkboxes[1]);
    expect(onSelectionChange).toHaveBeenCalledWith([testData[0]]);

    // Select all with header checkbox
    await user.click(checkboxes[0]);
    expect(onSelectionChange).toHaveBeenCalledWith(testData);
  });

  it('implements pagination', async () => {
    const moreData = Array.from({ length: 25 }, (_, i) => ({
      id: i + 1,
      name: `User ${i + 1}`,
      email: `user${i + 1}@example.com`,
      role: 'user' as const,
      createdAt: new Date(),
      active: true,
    }));

    render(<DataTable data={moreData} columns={columns} pagination pageSize={10} />);

    // Should show first 10 items
    expect(screen.getByText('User 1')).toBeInTheDocument();
    expect(screen.getByText('User 10')).toBeInTheDocument();
    expect(screen.queryByText('User 11')).not.toBeInTheDocument();

    // Should show pagination controls
    expect(screen.getByText('1')).toBeInTheDocument(); // Current page
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();

    // Go to next page
    await user.click(screen.getByText('2'));
    expect(screen.getByText('User 11')).toBeInTheDocument();
    expect(screen.getByText('User 20')).toBeInTheDocument();
    expect(screen.queryByText('User 10')).not.toBeInTheDocument();
  });

  it('shows items per page selector', async () => {
    const moreData = Array.from({ length: 50 }, (_, i) => ({
      id: i + 1,
      name: `User ${i + 1}`,
      email: `user${i + 1}@example.com`,
      role: 'user' as const,
      createdAt: new Date(),
      active: true,
    }));

    render(<DataTable data={moreData} columns={columns} pagination />);

    const pageSizeSelect = screen.getByDisplayValue('10');
    expect(pageSizeSelect).toBeInTheDocument();

    await user.selectOptions(pageSizeSelect, '25');
    
    // Should now show 25 items
    expect(screen.getByText('User 25')).toBeInTheDocument();
    expect(screen.queryByText('User 26')).not.toBeInTheDocument();
  });

  it('combines search and pagination', async () => {
    const moreData = Array.from({ length: 25 }, (_, i) => ({
      id: i + 1,
      name: i < 5 ? `John ${i + 1}` : `User ${i + 1}`,
      email: `user${i + 1}@example.com`,
      role: 'user' as const,
      createdAt: new Date(),
      active: true,
    }));

    render(<DataTable data={moreData} columns={columns} pagination searchable pageSize={3} />);

    const searchInput = screen.getByPlaceholderText('Search...');
    await user.type(searchInput, 'John');

    await waitFor(() => {
      // Should show filtered results with pagination
      expect(screen.getByText('John 1')).toBeInTheDocument();
      expect(screen.getByText('John 2')).toBeInTheDocument();
      expect(screen.getByText('John 3')).toBeInTheDocument();
      expect(screen.queryByText('John 4')).not.toBeInTheDocument(); // On next page
    });
  });

  it('has proper accessibility attributes', () => {
    render(<DataTable data={testData} columns={columns} />);

    const table = screen.getByRole('table');
    expect(table).toBeInTheDocument();

    const columnHeaders = screen.getAllByRole('columnheader');
    expect(columnHeaders).toHaveLength(columns.length);

    const rows = screen.getAllByRole('row');
    expect(rows).toHaveLength(4); // Header + 3 data rows
  });

  it('supports keyboard navigation', async () => {
    const onRowClick = vi.fn();
    render(<DataTable data={testData} columns={columns} onRowClick={onRowClick} />);

    const firstRow = screen.getByText('John Doe').closest('tr');
    firstRow?.focus();

    expect(firstRow).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(onRowClick).toHaveBeenCalledWith(testData[0]);
  });

  it('disables sorting for non-sortable columns', async () => {
    const nonSortableColumns: Column<TestData>[] = [
      {
        key: 'name',
        header: 'Name',
        accessor: 'name',
        sortable: false,
      },
      {
        key: 'email',
        header: 'Email',
        accessor: 'email',
        // sortable not specified, should default to false
      },
    ];

    render(<DataTable data={testData} columns={nonSortableColumns} sortable />);

    const nameHeader = screen.getByText('Name');
    const emailHeader = screen.getByText('Email');

    // Headers should not have click handlers
    expect(nameHeader.parentElement).not.toHaveClass('cursor-pointer');
    expect(emailHeader.parentElement).not.toHaveClass('cursor-pointer');

    // Clicking should not change order
    const originalFirstRow = screen.getAllByRole('row')[1].textContent;
    await user.click(nameHeader);
    const firstRowAfterClick = screen.getAllByRole('row')[1].textContent;
    expect(originalFirstRow).toBe(firstRowAfterClick);
  });

  it('applies custom className', () => {
    render(<DataTable data={testData} columns={columns} className="custom-table" />);

    const tableContainer = screen.getByRole('table').closest('.custom-table');
    expect(tableContainer).toBeInTheDocument();
  });
});