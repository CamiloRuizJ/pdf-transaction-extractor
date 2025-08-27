import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  ZoomInIcon, 
  ZoomOutIcon,
  ArrowsPointingOutIcon,
  EyeIcon,
  EyeSlashIcon,
  DocumentIcon
} from '@heroicons/react/24/outline';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { cn } from '../../utils/cn';
import type { Region } from '../../types';

interface DocumentPreviewProps {
  documentUrl?: string;
  regions?: Region[];
  onRegionClick?: (region: Region) => void;
  onRegionCreate?: (region: Omit<Region, 'id'>) => void;
  showRegions?: boolean;
  allowRegionCreation?: boolean;
  className?: string;
}

interface ViewerState {
  zoom: number;
  panX: number;
  panY: number;
  isDragging: boolean;
  isCreatingRegion: boolean;
  creationStart: { x: number; y: number } | null;
  creationEnd: { x: number; y: number } | null;
}

export function DocumentPreview({
  documentUrl,
  regions = [],
  onRegionClick,
  onRegionCreate,
  showRegions = true,
  allowRegionCreation = false,
  className,
}: DocumentPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  
  const [viewerState, setViewerState] = useState<ViewerState>({
    zoom: 1,
    panX: 0,
    panY: 0,
    isDragging: false,
    isCreatingRegion: false,
    creationStart: null,
    creationEnd: null,
  });

  const handleZoomIn = () => {
    setViewerState(prev => ({
      ...prev,
      zoom: Math.min(prev.zoom * 1.25, 5)
    }));
  };

  const handleZoomOut = () => {
    setViewerState(prev => ({
      ...prev,
      zoom: Math.max(prev.zoom / 1.25, 0.1)
    }));
  };

  const handleResetView = () => {
    setViewerState(prev => ({
      ...prev,
      zoom: 1,
      panX: 0,
      panY: 0,
    }));
  };

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!imageLoaded) return;
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (allowRegionCreation && e.shiftKey) {
      // Start creating a region
      setViewerState(prev => ({
        ...prev,
        isCreatingRegion: true,
        creationStart: { x, y },
        creationEnd: { x, y },
      }));
    } else {
      // Start panning
      setViewerState(prev => ({
        ...prev,
        isDragging: true,
      }));
    }
  }, [imageLoaded, allowRegionCreation]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!imageLoaded) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (viewerState.isCreatingRegion && viewerState.creationStart) {
      setViewerState(prev => ({
        ...prev,
        creationEnd: { x, y },
      }));
    } else if (viewerState.isDragging) {
      setViewerState(prev => ({
        ...prev,
        panX: prev.panX + e.movementX,
        panY: prev.panY + e.movementY,
      }));
    }
  }, [imageLoaded, viewerState.isCreatingRegion, viewerState.creationStart, viewerState.isDragging]);

  const handleMouseUp = useCallback(() => {
    if (viewerState.isCreatingRegion && viewerState.creationStart && viewerState.creationEnd && onRegionCreate) {
      const rect = containerRef.current?.getBoundingClientRect();
      const img = imageRef.current;
      
      if (rect && img) {
        const imgRect = img.getBoundingClientRect();
        
        // Convert screen coordinates to image coordinates
        const scaleX = img.naturalWidth / imgRect.width;
        const scaleY = img.naturalHeight / imgRect.height;
        
        const startX = (viewerState.creationStart.x - imgRect.left + rect.left) * scaleX;
        const startY = (viewerState.creationStart.y - imgRect.top + rect.top) * scaleY;
        const endX = (viewerState.creationEnd.x - imgRect.left + rect.left) * scaleX;
        const endY = (viewerState.creationEnd.y - imgRect.top + rect.top) * scaleY;
        
        const region: Omit<Region, 'id'> = {
          x: Math.min(startX, endX),
          y: Math.min(startY, endY),
          width: Math.abs(endX - startX),
          height: Math.abs(endY - startY),
          page: 0, // Assuming single page for now
          type: 'user-created',
          label: 'New Region',
        };

        onRegionCreate(region);
      }
    }

    setViewerState(prev => ({
      ...prev,
      isDragging: false,
      isCreatingRegion: false,
      creationStart: null,
      creationEnd: null,
    }));
  }, [viewerState, onRegionCreate]);

  const handleRegionClick = (region: Region, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedRegion(region.id);
    onRegionClick?.(region);
  };

  const getRegionStyle = (region: Region) => {
    if (!imageRef.current) return {};

    const img = imageRef.current;
    const imgRect = img.getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect();
    
    if (!containerRect) return {};

    // Convert image coordinates to screen coordinates
    const scaleX = imgRect.width / img.naturalWidth;
    const scaleY = imgRect.height / img.naturalHeight;
    
    return {
      position: 'absolute' as const,
      left: (imgRect.left - containerRect.left) + (region.x * scaleX),
      top: (imgRect.top - containerRect.top) + (region.y * scaleY),
      width: region.width * scaleX,
      height: region.height * scaleY,
      border: selectedRegion === region.id ? '3px solid #2563eb' : '2px solid #10b981',
      backgroundColor: selectedRegion === region.id ? 'rgba(37, 99, 235, 0.2)' : 'rgba(16, 185, 129, 0.2)',
      cursor: 'pointer',
      zIndex: 10,
    };
  };

  const getCreationRegionStyle = () => {
    if (!viewerState.isCreatingRegion || !viewerState.creationStart || !viewerState.creationEnd) {
      return { display: 'none' };
    }

    const start = viewerState.creationStart;
    const end = viewerState.creationEnd;

    return {
      position: 'absolute' as const,
      left: Math.min(start.x, end.x),
      top: Math.min(start.y, end.y),
      width: Math.abs(end.x - start.x),
      height: Math.abs(end.y - start.y),
      border: '2px dashed #f59e0b',
      backgroundColor: 'rgba(245, 158, 11, 0.2)',
      pointerEvents: 'none' as const,
      zIndex: 20,
    };
  };

  return (
    <Card className={cn('h-full flex flex-col', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <DocumentIcon className="h-5 w-5" />
            Document Preview
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewerState(prev => ({ ...prev, showRegions: !showRegions }))}
            >
              {showRegions ? (
                <>
                  <EyeSlashIcon className="h-4 w-4 mr-2" />
                  Hide Regions
                </>
              ) : (
                <>
                  <EyeIcon className="h-4 w-4 mr-2" />
                  Show Regions
                </>
              )}
            </Button>
            
            <div className="flex items-center border rounded-md">
              <Button
                variant="outline"
                size="sm"
                onClick={handleZoomOut}
                className="border-0 rounded-r-none"
              >
                <ZoomOutIcon className="h-4 w-4" />
              </Button>
              
              <div className="px-3 py-1 text-sm border-x bg-neutral-50">
                {Math.round(viewerState.zoom * 100)}%
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleZoomIn}
                className="border-0 rounded-l-none"
              >
                <ZoomInIcon className="h-4 w-4" />
              </Button>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetView}
            >
              <ArrowsPointingOutIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {allowRegionCreation && (
          <div className="text-sm text-neutral-600">
            Hold Shift + Click and drag to create regions
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 p-0 relative overflow-hidden">
        <div
          ref={containerRef}
          className="w-full h-full relative cursor-move"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {documentUrl ? (
            <>
              {/* Check if URL is a PDF */}
              {documentUrl.toLowerCase().includes('.pdf') || documentUrl.includes('supabase') ? (
                <iframe
                  src={documentUrl}
                  className="w-full h-full border-0"
                  title="PDF Preview"
                  onLoad={() => {
                    setImageLoaded(true);
                    setImageError(false);
                  }}
                  onError={() => {
                    setImageError(true);
                    setImageLoaded(false);
                  }}
                />
              ) : (
                <img
                  ref={imageRef}
                  src={documentUrl}
                  alt="Document preview"
                  className="max-w-none"
                  style={{
                    transform: `translate(${viewerState.panX}px, ${viewerState.panY}px) scale(${viewerState.zoom})`,
                    transformOrigin: 'top left',
                    transition: viewerState.isDragging ? 'none' : 'transform 0.1s ease-out',
                  }}
                  onLoad={() => {
                    setImageLoaded(true);
                    setImageError(false);
                  }}
                  onError={() => {
                    setImageError(true);
                    setImageLoaded(false);
                  }}
                  draggable={false}
                />
              )}
              
              {/* Regions */}
              {showRegions && imageLoaded && regions.map((region) => (
                <div
                  key={region.id}
                  style={getRegionStyle(region)}
                  onClick={(e) => handleRegionClick(region, e)}
                  title={`${region.label} (${Math.round(region.confidence || 0)}% confidence)`}
                >
                  <div className="absolute -top-6 left-0 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                    {region.label}
                  </div>
                </div>
              ))}
              
              {/* Creation region */}
              <div style={getCreationRegionStyle()} />
            </>
          ) : imageError ? (
            <div className="flex items-center justify-center h-full text-neutral-500">
              <div className="text-center">
                <DocumentIcon className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p>Failed to load document preview</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-neutral-500">
              <div className="text-center">
                <DocumentIcon className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p>No document selected</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
      
      {/* Region Info Panel */}
      {selectedRegion && (
        <div className="border-t p-4 bg-neutral-50">
          {(() => {
            const region = regions.find(r => r.id === selectedRegion);
            if (!region) return null;
            
            return (
              <div>
                <h4 className="font-medium text-neutral-900 mb-2">{region.label}</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-neutral-500">Type:</span>
                    <span className="ml-2 text-neutral-900">{region.type}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500">Confidence:</span>
                    <span className="ml-2 text-neutral-900">{Math.round((region.confidence || 0) * 100)}%</span>
                  </div>
                  <div>
                    <span className="text-neutral-500">Position:</span>
                    <span className="ml-2 text-neutral-900">{Math.round(region.x)}, {Math.round(region.y)}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500">Size:</span>
                    <span className="ml-2 text-neutral-900">{Math.round(region.width)} × {Math.round(region.height)}</span>
                  </div>
                </div>
                
                {region.extractedText && (
                  <div className="mt-3">
                    <span className="text-neutral-500 text-sm">Extracted Text:</span>
                    <div className="mt-1 p-2 bg-white rounded border text-sm">
                      {region.extractedText}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </Card>
  );
}