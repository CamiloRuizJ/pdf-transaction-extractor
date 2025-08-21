# PDF Extractor V1 - Simple Version

A lightweight, basic PDF transaction extraction tool with essential functionality.

## Overview

This is the simple version of the PDF Transaction Extractor, designed for basic use cases where you need quick and straightforward PDF text extraction without advanced features.

## Features

- ✅ Basic PDF text extraction
- ✅ Simple transaction parsing
- ✅ Minimal dependencies
- ✅ Fast processing
- ✅ Easy deployment
- ✅ Lightweight implementation

## Quick Start

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Run the application:**
   ```bash
   python app_simple.py
   ```

3. **Open your browser:**
   ```
   http://localhost:5000
   ```

## Files

- `app_simple.py` - Main Flask application
- `config_simple.py` - Configuration settings
- `models_simple.py` - Data models
- `utils_simple.py` - Utility functions
- `requirements.txt` - Python dependencies

## Usage

1. Upload a PDF file
2. The application will extract text from all pages
3. Download the extracted data as a text file

## Dependencies

- Flask
- PyPDF2
- Basic Python libraries

## Limitations

- No region-based extraction
- No Excel export
- No advanced OCR
- Basic text extraction only

## When to Use V1

- Simple text extraction needs
- Quick prototyping
- Limited resources
- Basic PDF processing
- Learning/educational purposes
