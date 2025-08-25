import { useState, useEffect } from 'react';
import { 
  DocumentTextIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  CpuChipIcon
} from '@heroicons/react/24/outline';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Progress, CircularProgress } from '../ui/Progress';
import { DataTable, type Column } from '../ui/DataTable';
import { apiService } from '../../services/api';
import { usePolling } from '../../services/pollingService';
import type { ProcessingResult, DocumentType, UploadedFile } from '../../types';

interface DashboardStats {
  totalDocuments: number;
  processingDocuments: number;
  completedDocuments: number;
  errorDocuments: number;
  averageProcessingTime: number;
  averageConfidence: number;
  systemHealth: 'healthy' | 'degraded' | 'error';
  aiServiceStatus: 'online' | 'offline' | 'degraded';
}

interface ProcessingActivity {
  id: string;
  filename: string;
  documentType: DocumentType;
  status: 'processing' | 'completed' | 'error';
  startTime: Date;
  endTime?: Date;
  confidence?: number;
  error?: string;
}

interface DashboardProps {
  files: UploadedFile[];
  results: Record<string, ProcessingResult>;
  isProcessing: boolean;
  className?: string;
}

export function Dashboard({ files, results, isProcessing, className }: DashboardProps) {
  const [stats, setStats] = useState<DashboardStats>({
    totalDocuments: 0,
    processingDocuments: 0,
    completedDocuments: 0,
    errorDocuments: 0,
    averageProcessingTime: 0,
    averageConfidence: 0,
    systemHealth: 'healthy',
    aiServiceStatus: 'online',
  });

  const [recentActivity, setRecentActivity] = useState<ProcessingActivity[]>([]);
  const [systemMetrics, setSystemMetrics] = useState({
    cpuUsage: 45,
    memoryUsage: 67,
    apiLatency: 120,
  });

  // Poll for system health
  usePolling(
    'system-health',
    async () => {
      try {
        const [healthResponse, aiStatusResponse] = await Promise.all([
          apiService.healthCheck(),
          apiService.getAIStatus(),
        ]);

        setStats(prev => ({
          ...prev,
          systemHealth: healthResponse.success ? 'healthy' : 'error',
          aiServiceStatus: aiStatusResponse.data?.configured ? 'online' : 'offline',
        }));

        return { health: healthResponse, aiStatus: aiStatusResponse };
      } catch (error) {
        setStats(prev => ({
          ...prev,
          systemHealth: 'error',
          aiServiceStatus: 'offline',
        }));
        throw error;
      }
    },
    {
      interval: 30000, // Poll every 30 seconds
      onError: (error) => console.error('Health check failed:', error),
    }
  );

  // Update stats when files or results change
  useEffect(() => {
    const totalFiles = files.length;
    const processingFiles = files.filter(f => f.status === 'processing').length;
    const completedFiles = files.filter(f => f.status === 'completed').length;
    const errorFiles = files.filter(f => f.status === 'error').length;

    const resultsList = Object.values(results);
    const avgConfidence = resultsList.length > 0
      ? resultsList.reduce((acc, result) => acc + (result.confidence || 0), 0) / resultsList.length
      : 0;

    setStats(prev => ({
      ...prev,
      totalDocuments: totalFiles,
      processingDocuments: processingFiles,
      completedDocuments: completedFiles,
      errorDocuments: errorFiles,
      averageConfidence: avgConfidence,
    }));

    // Update recent activity
    const activity: ProcessingActivity[] = files.map(file => ({
      id: file.id,
      filename: file.name,
      documentType: results[file.id]?.documentType || 'unknown',
      status: file.status === 'completed' ? 'completed' 
            : file.status === 'error' ? 'error' 
            : file.status === 'processing' ? 'processing'
            : 'processing',
      startTime: new Date(), // This should come from actual processing start time
      endTime: file.status === 'completed' ? new Date() : undefined,
      confidence: results[file.id]?.confidence,
      error: file.error,
    }));

    setRecentActivity(activity.slice(-10)); // Keep last 10 items
  }, [files, results]);

  // Simulate system metrics updates
  useEffect(() => {
    const interval = setInterval(() => {
      setSystemMetrics(prev => ({
        cpuUsage: Math.max(20, Math.min(90, prev.cpuUsage + (Math.random() - 0.5) * 10)),
        memoryUsage: Math.max(30, Math.min(95, prev.memoryUsage + (Math.random() - 0.5) * 8)),
        apiLatency: Math.max(50, Math.min(500, prev.apiLatency + (Math.random() - 0.5) * 50)),
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const activityColumns: Column<ProcessingActivity>[] = [
    {
      key: 'filename',
      header: 'File',
      accessor: 'filename',
      sortable: true,
      render: (value: string) => (
        <div className="flex items-center">
          <DocumentTextIcon className="h-4 w-4 text-neutral-400 mr-2" />
          <span className="truncate max-w-48" title={value}>{value}</span>
        </div>
      ),
    },
    {
      key: 'documentType',
      header: 'Type',
      accessor: 'documentType',
      sortable: true,
      render: (value: DocumentType) => (
        <span className="capitalize text-sm">{value.replace('_', ' ')}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      accessor: 'status',
      sortable: true,
      render: (value: string) => {
        const styles = {
          processing: 'bg-primary-100 text-primary-800',
          completed: 'bg-success-100 text-success-800',
          error: 'bg-error-100 text-error-800',
        };
        
        return (
          <span className={`px-2 py-1 text-xs rounded-full ${styles[value as keyof typeof styles]}`}>
            {value}
          </span>
        );
      },
    },
    {
      key: 'confidence',
      header: 'Confidence',
      accessor: 'confidence',
      sortable: true,
      render: (value?: number) => 
        value ? `${Math.round(value * 100)}%` : '—',
    },
    {
      key: 'startTime',
      header: 'Started',
      accessor: 'startTime',
      sortable: true,
      render: (value: Date) => value.toLocaleTimeString(),
    },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'online':
        return <CheckCircleIcon className="h-5 w-5 text-success-500" />;
      case 'degraded':
        return <ExclamationCircleIcon className="h-5 w-5 text-warning-500" />;
      case 'error':
      case 'offline':
        return <ExclamationCircleIcon className="h-5 w-5 text-error-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-neutral-400" />;
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Total Documents</p>
                <p className="text-2xl font-bold text-neutral-900">{stats.totalDocuments}</p>
              </div>
              <DocumentTextIcon className="h-8 w-8 text-primary-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Processing</p>
                <p className="text-2xl font-bold text-warning-600">{stats.processingDocuments}</p>
              </div>
              <ClockIcon className="h-8 w-8 text-warning-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Completed</p>
                <p className="text-2xl font-bold text-success-600">{stats.completedDocuments}</p>
              </div>
              <CheckCircleIcon className="h-8 w-8 text-success-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Average Confidence</p>
                <p className="text-2xl font-bold text-primary-600">
                  {Math.round(stats.averageConfidence * 100)}%
                </p>
              </div>
              <ArrowTrendingUpIcon className="h-8 w-8 text-primary-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Status & Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>System Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">System Status</span>
                <div className="flex items-center gap-2">
                  {getStatusIcon(stats.systemHealth)}
                  <span className="text-sm capitalize">{stats.systemHealth}</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">AI Service</span>
                <div className="flex items-center gap-2">
                  {getStatusIcon(stats.aiServiceStatus)}
                  <span className="text-sm capitalize">{stats.aiServiceStatus}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>CPU Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center">
              <CircularProgress
                value={systemMetrics.cpuUsage}
                variant={systemMetrics.cpuUsage > 80 ? 'error' : systemMetrics.cpuUsage > 60 ? 'warning' : 'primary'}
                label={
                  <div className="text-center">
                    <CpuChipIcon className="h-6 w-6 mx-auto mb-1 text-neutral-400" />
                    <div className="text-xs text-neutral-500">CPU</div>
                  </div>
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Memory Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Progress
                value={systemMetrics.memoryUsage}
                variant={systemMetrics.memoryUsage > 85 ? 'error' : systemMetrics.memoryUsage > 70 ? 'warning' : 'primary'}
                showLabel
                label="Memory"
              />
              
              <div className="text-sm text-neutral-600">
                API Latency: {systemMetrics.apiLatency}ms
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ChartBarIcon className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={recentActivity}
            columns={activityColumns}
            pageSize={5}
            searchable={false}
            emptyMessage="No recent activity"
          />
        </CardContent>
      </Card>
    </div>
  );
}