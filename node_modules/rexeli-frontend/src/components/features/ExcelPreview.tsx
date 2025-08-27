import { useMemo } from 'react';
import { DataTable, Column } from '../ui/DataTable';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { DocumentChartBarIcon, TableCellsIcon } from '@heroicons/react/24/outline';
import { cn } from '../../utils/cn';
import type { ProcessingResult } from '../../types';

interface ExcelPreviewProps {
  results: ProcessingResult[];
  className?: string;
}

interface ExcelRow {
  id: string;
  fileName: string;
  documentType: string;
  confidence: string;
  [key: string]: any; // For dynamic extracted data fields
}

export function ExcelPreview({ results, className }: ExcelPreviewProps) {
  // Transform processing results into Excel-like tabular data
  const { excelData, columns } = useMemo(() => {
    if (!results || results.length === 0) {
      return { excelData: [], columns: [] };
    }

    // Collect all unique data fields across all documents
    const allFields = new Set<string>();
    results.forEach(result => {
      if (result.extractedData) {
        Object.keys(result.extractedData).forEach(key => allFields.add(key));
      }
    });

    // Create base columns
    const baseColumns: Column<ExcelRow>[] = [
      {
        key: 'fileName',
        header: 'File Name',
        accessor: 'fileName',
        sortable: true,
        width: '200px',
      },
      {
        key: 'documentType',
        header: 'Document Type',
        accessor: 'documentType',
        sortable: true,
        width: '150px',
        render: (value) => (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
            {value.replace(/_/g, ' ').replace(/\\b\\w/g, (l: string) => l.toUpperCase())}
          </span>
        ),
      },
      {
        key: 'confidence',
        header: 'Confidence',
        accessor: 'confidence',
        sortable: true,
        width: '100px',
        align: 'center' as const,
        render: (value) => {
          const confidence = parseFloat(value.replace('%', ''));
          return (
            <div className="flex items-center justify-center">
              <span className={cn(
                'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                confidence >= 90 && 'bg-success-100 text-success-800',
                confidence >= 70 && confidence < 90 && 'bg-warning-100 text-warning-800',
                confidence < 70 && 'bg-error-100 text-error-800'
              )}>
                {value}
              </span>
            </div>
          );
        },
      },
    ];

    // Add columns for extracted data fields
    const dataColumns: Column<ExcelRow>[] = Array.from(allFields).map(field => ({
      key: field,
      header: field.replace(/_/g, ' ').replace(/\\b\\w/g, (l: string) => l.toUpperCase()),
      accessor: field,
      sortable: true,
      width: '150px',
      render: (value, row) => {
        if (!value) return <span className="text-neutral-400">—</span>;
        
        // Show confidence indicator for extracted data
        const fieldData = results.find(r => r.id === row.id)?.extractedData?.[field];
        if (typeof fieldData === 'object' && fieldData?.confidence) {
          const confidence = fieldData.confidence * 100;
          return (
            <div className="space-y-1">
              <div className="text-sm text-neutral-900">{fieldData.value || value}</div>
              <div className={cn(
                'text-xs',
                confidence >= 90 && 'text-success-600',
                confidence >= 70 && confidence < 90 && 'text-warning-600',
                confidence < 70 && 'text-error-600'
              )}>
                {confidence.toFixed(0)}% confidence
              </div>
            </div>
          );
        }
        
        return <div className="text-sm text-neutral-900">{value}</div>;
      },
    }));

    const allColumns = [...baseColumns, ...dataColumns];

    // Transform results into table rows
    const excelData: ExcelRow[] = results.map(result => {
      const row: ExcelRow = {
        id: result.id,
        fileName: `Document ${result.fileId?.slice(0, 8) || 'Unknown'}`,
        documentType: result.documentType || 'unknown',
        confidence: `${Math.round((result.confidence || 0) * 100)}%`,
      };

      // Add extracted data fields
      if (result.extractedData) {
        Object.entries(result.extractedData).forEach(([key, value]) => {
          if (typeof value === 'object' && value?.value) {
            row[key] = value.value;
          } else {
            row[key] = value;
          }
        });
      }

      return row;
    });

    return { excelData, columns: allColumns };
  }, [results]);

  if (!results || results.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TableCellsIcon className="h-5 w-5" />
            Excel Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-neutral-500">
            <DocumentChartBarIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Process documents to see extracted data preview</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TableCellsIcon className="h-5 w-5" />
            Excel Preview
          </CardTitle>
          <div className="text-sm text-neutral-600">
            {results.length} document{results.length > 1 ? 's' : ''} • {columns.length - 3} data fields
          </div>
        </div>
        <p className="text-sm text-neutral-600 mt-1">
          Preview how your extracted data will appear in the Excel export
        </p>
      </CardHeader>
      
      <CardContent className="p-0">
        <DataTable
          data={excelData}
          columns={columns}
          searchable={true}
          sortable={true}
          pagination={true}
          pageSize={10}
          emptyMessage="No processed documents to preview"
          className="border-0 shadow-none"
        />
      </CardContent>
      
      {/* Data Quality Summary */}
      <div className="border-t border-neutral-200 p-4 bg-neutral-50">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="text-center">
            <div className="font-medium text-neutral-900">
              {results.reduce((sum, r) => sum + Object.keys(r.extractedData || {}).length, 0)}
            </div>
            <div className="text-neutral-500">Total Fields</div>
          </div>
          <div className="text-center">
            <div className="font-medium text-success-600">
              {Math.round(
                results.reduce((sum, r) => sum + (r.confidence || 0), 0) / results.length * 100
              )}%
            </div>
            <div className="text-neutral-500">Avg Confidence</div>
          </div>
          <div className="text-center">
            <div className="font-medium text-primary-600">
              {Math.round(
                results.reduce((sum, r) => sum + (r.qualityScore || 0), 0) / results.length * 100
              )}%
            </div>
            <div className="text-neutral-500">Avg Quality</div>
          </div>
          <div className="text-center">
            <div className="font-medium text-neutral-900">
              {results.filter(r => (r.errors || []).length === 0).length}
            </div>
            <div className="text-neutral-500">Clean Records</div>
          </div>
        </div>
      </div>
    </Card>
  );
}