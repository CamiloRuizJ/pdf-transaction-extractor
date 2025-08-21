# Quick Start Guide

Get the PDF Transaction Extractor running in 5 minutes!

## Windows Users

1. **Double-click `run.bat`**
   - This will automatically install Python dependencies and start the application
   - If Python is not installed, you'll be prompted to install it

2. **Open your web browser**
   - Go to: http://localhost:5000
   - The application interface will load

3. **Upload a PDF**
   - Drag and drop your PDF file or click "Choose PDF File"
   - The first page will be displayed

4. **Draw selection boxes**
   - Click and drag on the PDF to create rectangles around data fields
   - Name each region (e.g., "Address", "Base Rent", "Start Date")

5. **Extract data**
   - Click "Extract Data" to process all pages
   - Download the Excel file when complete

## macOS/Linux Users

1. **Make the script executable and run it:**
   ```bash
   chmod +x run.sh
   ./run.sh
   ```

2. **Follow steps 2-5 above**

## Manual Installation (if scripts don't work)

1. **Install Python 3.8+** from https://python.org

2. **Install Poppler:**
   - **Windows**: Download from https://github.com/oschwartz10612/poppler-windows/releases/
   - **macOS**: `brew install poppler`
   - **Linux**: `sudo apt-get install poppler-utils`

3. **Run these commands:**
   ```bash
   python -m venv venv
   venv\Scripts\activate  # Windows
   source venv/bin/activate  # macOS/Linux
   pip install -r requirements.txt
   python app.py
   ```

4. **Open http://localhost:5000 in your browser**

## Troubleshooting

**"Poppler not found" error:**
- Install Poppler (see step 2 above)
- Restart your terminal/command prompt
- On Windows, add Poppler's bin folder to your PATH

**"Port 5000 already in use" error:**
- Close other applications using port 5000
- Or modify the port in `app.py` line 365

**"Python not found" error:**
- Install Python 3.8+ from https://python.org
- Make sure to check "Add Python to PATH" during installation

## Need Help?

- Check the full README.md for detailed instructions
- Look at the troubleshooting section
- The application includes helpful error messages

---

**That's it!** You should now be able to extract data from your PDF reports. The interface is intuitive - just draw boxes around the data you want to extract and let the application do the rest. 