#!/usr/bin/env python3
"""
Download script for EAST text detection model.
The EAST (Efficient and Accurate Scene Text) detector is used for advanced text region detection.
"""

import os
import urllib.request
import urllib.error
from pathlib import Path

def download_east_model():
    """Download the EAST text detection model"""
    model_url = "https://github.com/oyyd/frozen_east_text_detection.pb/raw/master/frozen_east_text_detection.pb"
    model_path = Path(__file__).parent / "frozen_east_text_detection.pb"
    
    if model_path.exists():
        print(f"EAST model already exists at: {model_path}")
        return str(model_path)
    
    print("Downloading EAST text detection model...")
    print(f"URL: {model_url}")
    print(f"Destination: {model_path}")
    
    try:
        # Create a request with user agent to avoid blocking
        request = urllib.request.Request(
            model_url,
            headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        )
        
        with urllib.request.urlopen(request) as response:
            with open(model_path, 'wb') as f:
                f.write(response.read())
        
        print(f"Successfully downloaded EAST model to: {model_path}")
        print(f"Model size: {model_path.stat().st_size / (1024*1024):.1f} MB")
        return str(model_path)
        
    except urllib.error.URLError as e:
        print(f"Failed to download EAST model: {e}")
        print("You can manually download the model from:")
        print("https://github.com/opencv/opencv_extra/blob/master/testdata/dnn/frozen_east_text_detection.pb")
        print("and place it in the models/ directory")
        return None
    except Exception as e:
        print(f"Error downloading EAST model: {e}")
        return None

if __name__ == "__main__":
    download_east_model()