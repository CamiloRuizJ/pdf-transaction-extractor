# PDF Transaction Extractor

A powerful, interactive web-based tool for extracting structured data from commercial real estate PDF reports. This application allows users to visually select regions on PDF pages and automatically extract text from those regions across all pages, outputting the results to a formatted Excel spreadsheet.

## Features

### 🎯 Interactive Region Selection
- **Visual PDF Rendering**: High-quality PDF page display with zoom and pan capabilities
- **Click-and-Drag Selection**: Intuitive rectangle drawing tool for defining extraction regions
- **Region Management**: Name, edit, and delete selected regions with a user-friendly interface
- **Real-time Preview**: See your selected regions highlighted on the PDF page

### 📊 Smart Data Extraction
- **Multi-page Processing**: Automatically extract data from all pages in the PDF
- **Precise Text Extraction**: Accurate text extraction from user-defined regions
- **Pattern Recognition**: Built-in heuristics for detecting addresses, dates, square footage, and rent amounts
- **Coordinate Transformation**: Automatic conversion between screen and PDF coordinates

### 📈 Excel Output
- **Formatted Spreadsheets**: Professional Excel files with proper formatting
- **Auto-sized Columns**: Automatic column width adjustment based on content
- **Header Styling**: Bold headers with background colors for better readability
- **Structured Data**: One row per page/transaction with columns for each field

### 🎨 Modern User Interface
- **Responsive Design**: Works on desktop and mobile devices
- **Drag-and-Drop Upload**: Easy PDF file upload with visual feedback
- **Real-time Status Updates**: Clear feedback on processing status and errors
- **Keyboard Shortcuts**: Quick access to common functions

## Installation

### Local Development

#### Prerequisites

1. **Python 3.8 or higher**
2. **Poppler (for PDF rendering)**

#### Installing Poppler

**Windows:**
1. Download Poppler for Windows from: https://github.com/oschwartz10612/poppler-windows/releases/
2. Extract the downloaded file
3. Add the `bin` folder to your system PATH environment variable

**macOS:**
```bash
brew install poppler
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get install poppler-utils
```

**Linux (CentOS/RHEL):**
```bash
sudo yum install poppler-utils
```

### Setup Instructions

1. **Clone or download the project:**
   ```bash
   git clone <repository-url>
   cd pdf-transaction-extractor
   ```

2. **Create a virtual environment (recommended):**
   ```bash
   python -m venv venv
   
   # Windows
   venv\Scripts\activate
   
   # macOS/Linux
   source venv/bin/activate
   ```

3. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the application:**
   ```bash
   python app.py
   ```

5. **Open your web browser and navigate to:**
   ```
   http://localhost:5000
   ```

### PaaS Deployment

This application is configured for deployment on various PaaS platforms:

#### Quick Deploy Options

**Render:**
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

**Railway:**
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/new)

**Heroku:**
```bash
heroku create your-app-name
git push heroku main
```

#### Platform-Specific Setup

For detailed deployment instructions, see [PAAS_DEPLOYMENT_GUIDE.md](PAAS_DEPLOYMENT_GUIDE.md)

#### Environment Variables

Set these environment variables in your PaaS platform:

```
FLASK_ENV=production
FLASK_DEBUG=false
UPLOAD_FOLDER=uploads
TEMP_FOLDER=temp
```

## Usage Guide

### Step 1: Upload PDF
1. Click "Choose PDF File" or drag and drop your PDF file onto the upload area
2. The application will process the PDF and display the first page
3. File information (name, page count) will be shown in the control panel

### Step 2: Define Extraction Regions
1. **Draw Selection Boxes**: Click and drag on the PDF to create rectangular selection areas
2. **Name Each Region**: When you finish drawing a region, a dialog will appear asking you to name it
   - Use descriptive names like "Address", "Leased SF", "Base Rent", "Start Date", etc.
   - The application will apply pattern recognition based on the field name
3. **Review and Edit**: 
   - Click on existing regions to select them (they'll turn green)
   - Use the "Edit" button to rename regions
   - Use the "Delete" button to remove unwanted regions
4. **Save Regions**: Click "Save Regions" to confirm your selections

### Step 3: Extract Data
1. Click "Extract Data" to process all pages in the PDF
2. The application will:
   - Extract text from each defined region on every page
   - Apply pattern recognition heuristics based on field names
   - Generate a formatted Excel file
3. When complete, click "Download Excel File" to save the results

### Step 4: Review Results
- The Excel file will contain one row per page
- Each column corresponds to a field you defined
- Data is automatically formatted and cleaned

## Field Name Suggestions

For best results, use these field names to trigger pattern recognition:

### Address Fields
- `Address` - Full address with street, city, state
- `Street Address` - Street address only
- `City` - City name
- `State` - State abbreviation or name

### Property Information
- `Leased SF` - Square footage leased
- `Total SF` - Total square footage
- `Property Type` - Office, retail, industrial, etc.

### Financial Data
- `Base Rent` - Monthly or annual base rent
- `Rent PSF` - Rent per square foot
- `TI PSF` - Tenant improvement allowance per square foot
- `Free Rent` - Free rent period or amount

### Dates
- `Start Date` - Lease start date
- `End Date` - Lease end date
- `Date Leased` - Date the lease was signed
- `Commencement Date` - Lease commencement date

### Lease Terms
- `Lease Type` - Full service, NNN, modified gross, etc.
- `Term` - Lease term in months or years
- `Tenant` - Tenant name
- `Landlord` - Landlord name

## Technical Details

### Architecture
- **Backend**: Python Flask web server
- **Frontend**: HTML5 Canvas with JavaScript for interactive drawing
- **PDF Processing**: PyPDF2 for text extraction, pdf2image for rendering
- **Data Output**: pandas and openpyxl for Excel generation

### Key Components

#### PDF Processing Pipeline
1. **Upload**: Secure file upload with validation
2. **Rendering**: Convert PDF pages to high-quality images
3. **Region Selection**: Interactive canvas-based drawing tool
4. **Coordinate Mapping**: Convert screen coordinates to PDF coordinates
5. **Text Extraction**: Extract text from defined regions using PyPDF2
6. **Pattern Recognition**: Apply heuristics based on field names
7. **Data Export**: Generate formatted Excel spreadsheet

#### Pattern Recognition Heuristics
- **Address Detection**: US state abbreviations, street terms
- **Square Footage**: Numbers followed by SF, sq ft, square feet
- **Date Detection**: Multiple date formats (MM/DD/YYYY, MM-DD-YYYY, etc.)
- **Currency Detection**: Dollar amounts, rent patterns
- **Lease Types**: Common commercial lease terminology

### File Structure
```
pdf-transaction-extractor/
├── app.py                 # Main Flask application
├── requirements.txt       # Python dependencies
├── README.md             # This file
├── templates/
│   └── index.html        # Main web interface
├── uploads/              # Uploaded PDF files (created automatically)
└── temp/                 # Temporary files (created automatically)
```

## Troubleshooting

### Common Issues

**PDF won't upload:**
- Ensure the file is a valid PDF (not corrupted)
- Check file size (max 16MB)
- Verify file permissions

**Text extraction is empty:**
- The selected region may not contain extractable text
- Try selecting a larger area around the text
- Some PDFs have text as images (scanned documents)

**Poppler not found:**
- Ensure Poppler is installed and in your system PATH
- Restart your terminal/command prompt after installation
- On Windows, verify the PATH environment variable includes the Poppler bin directory

**Application won't start:**
- Check that all dependencies are installed: `pip install -r requirements.txt`
- Ensure Python 3.8+ is being used
- Check for port conflicts (default port 5000)

### Performance Tips
- For large PDFs (>50 pages), processing may take several minutes
- Close other applications to free up memory
- Use SSD storage for better I/O performance

## Advanced Features

### Custom Pattern Recognition
The application includes built-in heuristics for common real estate data types. You can extend these by modifying the `apply_heuristics()` function in `app.py`.

### Batch Processing
While the current version processes one PDF at a time, the architecture supports batch processing. Future versions may include:
- Multiple PDF upload
- Template saving and loading
- Automated processing workflows

### API Access
The application exposes RESTful endpoints that can be used for programmatic access:
- `POST /upload` - Upload PDF file
- `GET /render_page/<page_num>` - Get rendered page image
- `POST /save_regions` - Save region definitions
- `POST /extract_data` - Extract data from all pages
- `GET /download/<filename>` - Download extracted file

## Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues for:
- Bug reports
- Feature requests
- Documentation improvements
- Performance optimizations

## License

This project is open source and available under the MIT License.

## Support

For support, please:
1. Check the troubleshooting section above
2. Review the documentation
3. Open an issue on the project repository
4. Include detailed information about your problem and system configuration

---

**Note**: This tool is designed for commercial real estate PDF reports but can be adapted for other document types. The pattern recognition features are optimized for US real estate data but can be customized for other markets or document types. 