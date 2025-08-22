# Repository Organization Plan

## 🎯 **Goal**
Organize the PDF Transaction Extractor into two separate, clean projects:
1. **PDF-Extractor-V1** - Simple version
2. **PDF-Extractor-Enhanced** - Advanced version

## 📊 **Current State Analysis**

### ✅ **PDF-Extractor-V1 (Simple Version)**
**Status**: Mostly organized
**Files to keep**:
- `app_simple.py` - Main application
- `config_simple.py` - Configuration
- `models_simple.py` - Data models
- `utils_simple.py` - Utilities
- `requirements.txt` - Dependencies
- `README.md` - Documentation
- `start_app.bat` - Startup script
- `check_status.bat` - Status check
- `refresh_environment.bat` - Environment refresh
- `setup_environment.bat` - Setup script
- `FRESH_START_GUIDE.md` - Setup guide
- `COMMIT_SUMMARY.md` - Commit info
- `templates/` - HTML templates
- `static/` - CSS/JS files
- `temp/` - Temporary files
- `uploads/` - Upload directory
- `logs/` - Log files

**Files to remove**:
- `app.py` (duplicate of app_simple.py)
- `config.py` (duplicate of config_simple.py)
- `models/` (duplicate of models_simple.py)
- `utils/` (duplicate of utils_simple.py)
- `services/` (not needed for simple version)

### ✅ **PDF-Extractor-Enhanced (Advanced Version)**
**Status**: Well organized
**Current structure**:
- `CRE_PDF_Extractor/` - Main enhanced application
- `requirements.txt` - Enhanced dependencies
- `README.md` - Enhanced documentation
- `run_enhanced.bat` - Enhanced startup
- `wsgi.py` - WSGI configuration
- `poppler/` - PDF processing tools
- `install_*.bat` - Installation scripts
- `run.bat` / `run.sh` - Run scripts

### 📁 **Root Directory (Repository Level)**
**Files to keep**:
- `README.md` - Main repository documentation
- `.gitignore` - Git ignore rules
- `PATH_SETUP_SUMMARY.md` - PATH setup info
- `add_to_path.bat` / `add_to_path.ps1` - PATH scripts
- `verify_path.bat` - PATH verification

**Files to organize**:
- `requirements.txt` - Move to appropriate projects
- `venv/` - Keep at root level
- `logs/` - Move to appropriate projects
- `__pycache__/` - Clean up

**Files to move to Enhanced**:
- `Aptfile` - Deployment configuration
- `Procfile` - Heroku deployment
- `railway.json` - Railway deployment
- `runtime.txt` - Python runtime
- `render.yaml` - Render deployment
- `INSTALLATION_GUIDE.md` - Installation docs
- `LOCAL_TESTING_GUIDE.md` - Testing docs
- `PRODUCTION_DEPLOYMENT.md` - Production docs
- `PAAS_DEPLOYMENT_GUIDE.md` - PaaS docs
- `QUICK_START.md` - Quick start guide

**Files to archive**:
- `SIMPLIFICATION_SUMMARY.md` - Archive
- `SIMPLIFICATION_COMPARISON.md` - Archive
- `FINAL_REVIEW_REPORT.md` - Archive
- `CLEANUP_SUMMARY.md` - Archive
- `PROJECT_IMPROVEMENT_SUMMARY.md` - Archive

## 🚀 **Execution Plan**

### Step 1: Clean V1 Project
1. Remove duplicate files (app.py, config.py, models/, utils/, services/)
2. Rename app_simple.py to app.py
3. Rename config_simple.py to config.py
4. Update imports in all files

### Step 2: Organize Enhanced Project
1. Move deployment files to Enhanced project
2. Move documentation files to Enhanced project
3. Update Enhanced project README

### Step 3: Clean Root Directory
1. Move remaining files to appropriate projects
2. Create clean root README
3. Update .gitignore

### Step 4: Create Separate Commits
1. Commit V1 project changes
2. Commit Enhanced project changes
3. Commit root directory cleanup

## 📋 **Final Structure**

```
pdf-transaction-extractor/
├── README.md                    # Main repository README
├── .gitignore                   # Git ignore rules
├── venv/                        # Virtual environment
├── PATH_SETUP_SUMMARY.md        # PATH setup documentation
├── add_to_path.bat              # PATH setup script
├── add_to_path.ps1              # PATH setup script (PowerShell)
├── verify_path.bat              # PATH verification script
├── PDF-Extractor-V1/            # Simple version
│   ├── app.py                   # Main application
│   ├── config.py                # Configuration
│   ├── models.py                # Data models
│   ├── utils.py                 # Utilities
│   ├── requirements.txt         # Dependencies
│   ├── README.md                # V1 documentation
│   ├── start_app.bat            # Startup script
│   ├── check_status.bat         # Status check
│   ├── refresh_environment.bat  # Environment refresh
│   ├── setup_environment.bat    # Setup script
│   ├── FRESH_START_GUIDE.md     # Setup guide
│   ├── templates/               # HTML templates
│   ├── static/                  # CSS/JS files
│   ├── temp/                    # Temporary files
│   ├── uploads/                 # Upload directory
│   └── logs/                    # Log files
└── PDF-Extractor-Enhanced/      # Advanced version
    ├── CRE_PDF_Extractor/       # Main enhanced application
    ├── requirements.txt         # Enhanced dependencies
    ├── README.md                # Enhanced documentation
    ├── run_enhanced.bat         # Enhanced startup
    ├── wsgi.py                  # WSGI configuration
    ├── poppler/                 # PDF processing tools
    ├── install_*.bat            # Installation scripts
    ├── run.bat                  # Run script (Windows)
    ├── run.sh                   # Run script (Linux/Mac)
    ├── Aptfile                  # Heroku deployment
    ├── Procfile                 # Heroku deployment
    ├── railway.json             # Railway deployment
    ├── runtime.txt              # Python runtime
    ├── render.yaml              # Render deployment
    ├── INSTALLATION_GUIDE.md    # Installation docs
    ├── LOCAL_TESTING_GUIDE.md   # Testing docs
    ├── PRODUCTION_DEPLOYMENT.md # Production docs
    ├── PAAS_DEPLOYMENT_GUIDE.md # PaaS docs
    └── QUICK_START.md           # Quick start guide
```

## 🎯 **Success Criteria**
- [ ] V1 project is clean and self-contained
- [ ] Enhanced project is clean and self-contained
- [ ] Root directory is minimal and organized
- [ ] Each project can run independently
- [ ] Documentation is clear and up-to-date
- [ ] Separate commits for each project
