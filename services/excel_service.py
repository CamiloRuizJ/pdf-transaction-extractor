"""
Excel Service for PDF Transaction Extractor
Handles all Excel file generation functionality with clean separation of concerns.
"""

import os
import pandas as pd
from datetime import datetime
from typing import List, Dict, Any
from openpyxl.styles import Font, PatternFill

from utils.logger import get_logger

logger = get_logger(__name__)

class ExcelService:
    """Service for handling Excel file operations."""
    
    def __init__(self, config):
        self.config = config
    
    def create_excel_file(self, data: List[Dict[str, Any]], output_folder: str) -> str:
        """Create a formatted Excel file from extracted data."""
        try:
            # Create DataFrame
            df = pd.DataFrame(data)
            
            # Generate output filename
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            output_filename = f'extracted_data_{timestamp}.xlsx'
            output_path = os.path.join(output_folder, output_filename)
            
            # Save to Excel with formatting
            with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
                df.to_excel(writer, sheet_name=self.config.excel.sheet_name, index=False)
                
                # Get the workbook and worksheet
                workbook = writer.book
                worksheet = writer.sheets[self.config.excel.sheet_name]
                
                # Apply formatting
                self._format_worksheet(worksheet)
                
                # Auto-adjust column widths
                self._adjust_column_widths(worksheet)
            
            logger.info(f"Excel file created: {output_filename} with {len(data)} records")
            return output_filename
            
        except Exception as e:
            logger.error(f"Error creating Excel file: {e}")
            raise
    
    def _format_worksheet(self, worksheet):
        """Apply formatting to the worksheet."""
        try:
            # Format headers
            header_font = Font(
                bold=self.config.excel.header_font['bold'],
                size=self.config.excel.header_font['size']
            )
            
            header_fill = PatternFill(
                start_color=self.config.excel.header_fill['start_color'],
                end_color=self.config.excel.header_fill['end_color'],
                fill_type=self.config.excel.header_fill['fill_type']
            )
            
            # Apply formatting to header row
            for cell in worksheet[1]:
                cell.font = header_font
                cell.fill = header_fill
            
            logger.info("Applied header formatting to worksheet")
            
        except Exception as e:
            logger.error(f"Error formatting worksheet: {e}")
    
    def _adjust_column_widths(self, worksheet):
        """Auto-adjust column widths based on content."""
        try:
            for column in worksheet.columns:
                max_length = 0
                column_letter = column[0].column_letter
                
                # Find the maximum length in the column
                for cell in column:
                    try:
                        if cell.value:
                            cell_length = len(str(cell.value))
                            max_length = max(max_length, cell_length)
                    except:
                        pass
                
                # Set column width (with some padding)
                adjusted_width = min(max_length + 2, self.config.excel.max_column_width)
                adjusted_width = max(adjusted_width, self.config.excel.min_column_width)
                
                worksheet.column_dimensions[column_letter].width = adjusted_width
            
            logger.info("Adjusted column widths")
            
        except Exception as e:
            logger.error(f"Error adjusting column widths: {e}")
    
    def create_sample_preview(self, data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Create a sample preview of the Excel data for the UI."""
        try:
            if not data:
                return {
                    'columns': [],
                    'rows': [],
                    'total_records': 0
                }
            
            # Get column names from the first record
            columns = list(data[0].keys()) if data else []
            
            # Create sample rows (limit to first 5 for preview)
            sample_rows = data[:5]
            
            preview = {
                'columns': columns,
                'rows': sample_rows,
                'total_records': len(data)
            }
            
            logger.info(f"Created sample preview with {len(columns)} columns and {len(sample_rows)} sample rows")
            return preview
            
        except Exception as e:
            logger.error(f"Error creating sample preview: {e}")
            return {
                'columns': [],
                'rows': [],
                'total_records': 0,
                'error': str(e)
            }
    
    def validate_data(self, data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Validate the extracted data before creating Excel file."""
        try:
            validation_result = {
                'valid': True,
                'issues': [],
                'record_count': len(data),
                'field_count': 0
            }
            
            if not data:
                validation_result['valid'] = False
                validation_result['issues'].append("No data to export")
                return validation_result
            
            # Check if all records have the same fields
            first_record = data[0]
            expected_fields = set(first_record.keys())
            validation_result['field_count'] = len(expected_fields)
            
            for i, record in enumerate(data):
                record_fields = set(record.keys())
                
                # Check for missing fields
                missing_fields = expected_fields - record_fields
                if missing_fields:
                    validation_result['issues'].append(f"Record {i+1} missing fields: {missing_fields}")
                
                # Check for extra fields
                extra_fields = record_fields - expected_fields
                if extra_fields:
                    validation_result['issues'].append(f"Record {i+1} has extra fields: {extra_fields}")
            
            # Check for empty records
            empty_records = [i+1 for i, record in enumerate(data) if not any(record.values())]
            if empty_records:
                validation_result['issues'].append(f"Empty records found: {empty_records}")
            
            # Mark as invalid if there are issues
            if validation_result['issues']:
                validation_result['valid'] = False
            
            logger.info(f"Data validation completed: {validation_result['valid']} with {len(validation_result['issues'])} issues")
            return validation_result
            
        except Exception as e:
            logger.error(f"Error validating data: {e}")
            return {
                'valid': False,
                'issues': [f"Validation error: {str(e)}"],
                'record_count': 0,
                'field_count': 0
            }
    
    def get_excel_stats(self, file_path: str) -> Dict[str, Any]:
        """Get statistics about an Excel file."""
        try:
            if not os.path.exists(file_path):
                return {'error': 'File not found'}
            
            # Read the Excel file
            df = pd.read_excel(file_path)
            
            stats = {
                'file_size': os.path.getsize(file_path),
                'record_count': len(df),
                'column_count': len(df.columns),
                'columns': list(df.columns),
                'file_path': file_path,
                'created_at': datetime.fromtimestamp(os.path.getctime(file_path)).isoformat()
            }
            
            logger.info(f"Excel stats: {stats['record_count']} records, {stats['column_count']} columns")
            return stats
            
        except Exception as e:
            logger.error(f"Error getting Excel stats: {e}")
            return {'error': str(e)}
