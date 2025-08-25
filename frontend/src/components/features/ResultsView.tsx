import { useState, useMemo } from 'react';
import { 
  DocumentTextIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  FunnelIcon,
  Bars3BottomLeftIcon,
  Squares2X2Icon,
  StarIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { DataTable, Column } from '../ui/DataTable';
import { Modal } from '../ui/Modal';
import { DocumentPreview } from './DocumentPreview';
import { Progress } from '../ui/Progress';
import { cn } from '../../utils/cn';
import { useExport } from '../../hooks/useExport';
import type { ProcessingResult, DocumentType } from '../../types';

interface ResultsViewProps {
  results: Record<string, ProcessingResult>;
  onExport?: (results: ProcessingResult[]) => void;
  className?: string;
}

type ViewMode = 'table' | 'grid';
type FilterType = 'all' | DocumentType;
type SortType = 'name' | 'confidence' | 'quality' | 'date';

interface ResultDetailModalProps {
  result: ProcessingResult | null;
  isOpen: boolean;
  onClose: () => void;
}

function ResultDetailModal({ result, isOpen, onClose }: ResultDetailModalProps) {
  if (!result) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Processing Result - ${result.documentType.replace('_', ' ')}`}
      size="xl"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Document Preview */}
        <div className="space-y-4">
          <h4 className="font-medium text-neutral-900">Document Preview</h4>
          <DocumentPreview
            regions={result.regions}
            showRegions={true}
            className="h-96"
          />
        </div>

        {/* Result Details */}
        <div className="space-y-6">
          <div>
            <h4 className="font-medium text-neutral-900 mb-3">Document Information</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-neutral-500">Type:</span>
                <span className="ml-2 text-neutral-900 capitalize">
                  {result.documentType.replace('_', ' ')}
                </span>
              </div>
              <div>
                <span className="text-neutral-500">Confidence:</span>
                <span className="ml-2 text-neutral-900">{Math.round(result.confidence * 100)}%</span>
              </div>
              <div>
                <span className="text-neutral-500">Quality Score:</span>
                <span className="ml-2 text-neutral-900">{Math.round((result.qualityScore || 0) * 100)}%</span>
              </div>
              <div>
                <span className="text-neutral-500">Regions Found:</span>
                <span className="ml-2 text-neutral-900">{result.regions?.length || 0}</span>
              </div>
            </div>
          </div>

          {/* Extracted Data */}
          <div>
            <h4 className="font-medium text-neutral-900 mb-3">Extracted Data</h4>
            <div className="max-h-48 overflow-y-auto border rounded-lg">
              <div className="p-3 space-y-2">
                {Object.entries(result.extractedData).map(([key, value]) => (
                  <div key={key} className="text-sm">
                    <span className="font-medium text-neutral-700">{key}:</span>
                    <div className="ml-2 text-neutral-600 break-words">
                      {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Warnings and Errors */}
          {(result.warnings && result.warnings.length > 0) && (
            <div>
              <h4 className="font-medium text-warning-700 mb-2 flex items-center">
                <ExclamationTriangleIcon className="h-4 w-4 mr-2" />
                Warnings
              </h4>
              <ul className="text-sm text-warning-600 space-y-1">
                {result.warnings.map((warning, index) => (
                  <li key={index}>• {warning}</li>
                ))}
              </ul>
            </div>
          )}

          {(result.errors && result.errors.length > 0) && (
            <div>
              <h4 className="font-medium text-error-700 mb-2 flex items-center">
                <ExclamationTriangleIcon className="h-4 w-4 mr-2" />
                Errors
              </h4>
              <ul className="text-sm text-error-600 space-y-1">
                {result.errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        <Button variant="primary">
          <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
          Export This Result
        </Button>
      </div>
    </Modal>
  );
}

export function ResultsView({ results, onExport, className }: ResultsViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [sortType, setSortType] = useState<SortType>('date');
  const [selectedResult, setSelectedResult] = useState<ProcessingResult | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedForExport, setSelectedForExport] = useState<Set<string>>(new Set());

  const { exportStatus, exportToExcel } = useExport();

  const resultsList = useMemo(() => Object.values(results), [results]);

  const filteredAndSortedResults = useMemo(() => {
    let filtered = resultsList;

    // Apply filters
    if (filterType !== 'all') {
      filtered = filtered.filter(result => result.documentType === filterType);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortType) {
        case 'name':
          return a.fileId.localeCompare(b.fileId);
        case 'confidence':
          return (b.confidence || 0) - (a.confidence || 0);
        case 'quality':
          return (b.qualityScore || 0) - (a.qualityScore || 0);
        case 'date':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        default:
          return 0;
      }
    });

    return filtered;
  }, [resultsList, filterType, sortType]);

  const handleViewDetails = (result: ProcessingResult) => {
    setSelectedResult(result);
    setIsDetailModalOpen(true);
  };

  const handleExportSelected = async () => {
    const selectedResults = filteredAndSortedResults.filter(result => 
      selectedForExport.has(result.id)
    );
    
    if (selectedResults.length > 0) {
      try {
        await exportToExcel(selectedResults);
        setSelectedForExport(new Set());
      } catch (error) {
        console.error('Export failed:', error);
      }
    }
  };

  const handleExportAll = async () => {
    try {
      await exportToExcel(filteredAndSortedResults);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const getQualityColor = (score: number) => {
    if (score >= 0.9) return 'text-success-600';
    if (score >= 0.7) return 'text-warning-600';
    return 'text-error-600';
  };

  const columns: Column<ProcessingResult>[] = [
    {
      key: 'documentType',
      header: 'Document Type',
      accessor: 'documentType',
      sortable: true,
      render: (value: DocumentType) => (
        <div className="flex items-center">
          <DocumentTextIcon className="h-4 w-4 text-neutral-400 mr-2" />
          <span className="capitalize font-medium">{value.replace('_', ' ')}</span>
        </div>
      ),
    },
    {
      key: 'confidence',
      header: 'Confidence',
      accessor: 'confidence',
      sortable: true,
      render: (value: number) => (
        <div className="flex items-center">
          <Progress value={value * 100} size="sm" className="w-16 mr-2" />
          <span className="text-sm">{Math.round(value * 100)}%</span>
        </div>
      ),
    },
    {
      key: 'qualityScore',
      header: 'Quality',
      accessor: 'qualityScore',
      sortable: true,
      render: (value?: number) => {
        const score = value || 0;
        return (
          <div className="flex items-center">
            <StarIcon className={cn('h-4 w-4 mr-1', getQualityColor(score))} />
            <span className={cn('text-sm font-medium', getQualityColor(score))}>
              {Math.round(score * 100)}%
            </span>
          </div>
        );
      },
    },
    {
      key: 'regions',
      header: 'Regions',
      accessor: 'regions',
      render: (value?: any[]) => (
        <span className="text-sm text-neutral-600">{value?.length || 0}</span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Processed',
      accessor: 'createdAt',
      sortable: true,
      render: (value: Date) => (
        <span className="text-sm text-neutral-600">
          {new Date(value).toLocaleDateString()} {new Date(value).toLocaleTimeString()}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      accessor: () => null,
      render: (_, result: ProcessingResult) => (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleViewDetails(result);
            }}
          >
            <EyeIcon className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  if (resultsList.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="text-center py-12">
          <DocumentTextIcon className="h-16 w-16 text-neutral-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-neutral-900 mb-2">No Results Yet</h3>
          <p className="text-neutral-500">Process some documents to see results here.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Processing Results ({resultsList.length})</CardTitle>
            
            <div className="flex items-center gap-4">
              {/* View Mode Toggle */}
              <div className="flex items-center border rounded-lg p-1">
                <Button
                  variant={viewMode === 'table' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                  className="border-0"
                >
                  <Bars3BottomLeftIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'grid' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="border-0"
                >
                  <Squares2X2Icon className="h-4 w-4" />
                </Button>
              </div>

              {/* Filters */}
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as FilterType)}
                className="px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Types</option>
                <option value="rent_roll">Rent Roll</option>
                <option value="offering_memo">Offering Memo</option>
                <option value="lease_agreement">Lease Agreement</option>
                <option value="comparable_sales">Comparable Sales</option>
              </select>

              <select
                value={sortType}
                onChange={(e) => setSortType(e.target.value as SortType)}
                className="px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="date">Sort by Date</option>
                <option value="name">Sort by Name</option>
                <option value="confidence">Sort by Confidence</option>
                <option value="quality">Sort by Quality</option>
              </select>

              {/* Export Actions */}
              <div className="flex items-center gap-2">
                {selectedForExport.size > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportSelected}
                    loading={exportStatus.isExporting}
                  >
                    <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                    Export Selected ({selectedForExport.size})
                  </Button>
                )}
                
                <Button
                  variant="success"
                  size="sm"
                  onClick={handleExportAll}
                  loading={exportStatus.isExporting}
                >
                  <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                  Export All
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {viewMode === 'table' ? (
            <DataTable
              data={filteredAndSortedResults}
              columns={columns}
              selectable={true}
              onSelectionChange={(selected) => {
                const selectedIds = new Set(selected.map(result => result.id));
                setSelectedForExport(selectedIds);
              }}
              onRowClick={(result) => handleViewDetails(result)}
              searchable={false} // We handle filtering ourselves
              pagination={true}
              pageSize={10}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAndSortedResults.map((result) => (
                <Card
                  key={result.id}
                  className="cursor-pointer hover:shadow-medium transition-shadow"
                  onClick={() => handleViewDetails(result)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center">
                        <DocumentTextIcon className="h-5 w-5 text-neutral-400 mr-2" />
                        <span className="text-sm font-medium capitalize">
                          {result.documentType.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <StarIcon className={cn('h-4 w-4 mr-1', getQualityColor(result.qualityScore || 0))} />
                        <span className={cn('text-xs', getQualityColor(result.qualityScore || 0))}>
                          {Math.round((result.qualityScore || 0) * 100)}%
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <div className="text-xs text-neutral-500 mb-1">Confidence</div>
                        <Progress value={result.confidence * 100} size="sm" />
                      </div>

                      <div className="flex justify-between text-sm">
                        <span className="text-neutral-500">Regions:</span>
                        <span className="text-neutral-900">{result.regions?.length || 0}</span>
                      </div>

                      <div className="text-xs text-neutral-500">
                        {new Date(result.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Result Detail Modal */}
      <ResultDetailModal
        result={selectedResult}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedResult(null);
        }}
      />
    </>
  );
}