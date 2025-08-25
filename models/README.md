# Computer Vision Models

This directory contains pre-trained models used by the Smart Region Manager for advanced text detection and document analysis.

## EAST Text Detection Model

The **EAST (Efficient and Accurate Scene Text)** detector is a deep learning model specifically designed for text detection in natural scenes and documents.

### Model Details
- **File**: `frozen_east_text_detection.pb`
- **Size**: ~84 MB
- **Framework**: TensorFlow/OpenCV DNN
- **Purpose**: Detecting text regions in document images

### Downloading the Model

To download the EAST model, run:

```bash
python models/download_east_model.py
```

Or download manually from:
- **Primary**: https://github.com/opencv/opencv_extra/blob/master/testdata/dnn/frozen_east_text_detection.pb
- **Alternative**: https://github.com/oyyd/frozen_east_text_detection.pb/raw/master/frozen_east_text_detection.pb

### Model Usage

The EAST model is automatically loaded by the `SmartRegionManager` class if present. It provides:

1. **High-accuracy text detection** - Better than traditional CV methods
2. **Rotated text handling** - Can detect text at various angles
3. **Multi-scale detection** - Works with different text sizes
4. **Real-time performance** - Optimized for fast inference

### Fallback Behavior

If the EAST model is not available, the Smart Region Manager will automatically fall back to:
1. **Traditional CV methods** - Connected components analysis
2. **Contour-based detection** - Edge detection and morphological operations
3. **Template-based regions** - Document-specific heuristics

This ensures the system remains functional even without the deep learning model.

### Model Integration

The model is integrated into the computer vision pipeline as follows:

```python
# In SmartRegionManager
if self.east_net is not None:
    east_regions = self._detect_text_with_east(image)
    regions.extend(east_regions)
```

### Performance Notes

- **Memory Usage**: ~200 MB when loaded
- **Inference Time**: 100-300ms per image (CPU)
- **Accuracy**: 85-95% text region detection
- **Input Requirements**: Image dimensions must be multiples of 32

### Alternative Models

Future versions may support additional text detection models:
- **CRAFT** - Character Region Awareness for Text detection
- **TextBoxes** - End-to-end text detection and recognition
- **DBNet** - Real-time scene text detection

## Directory Structure

```
models/
├── README.md                        # This file
├── download_east_model.py          # Download script
├── frozen_east_text_detection.pb   # EAST model (download required)
└── [future models]                 # Additional CV models
```

## Troubleshooting

### Model Loading Issues

1. **File not found**: Run the download script or check file permissions
2. **OpenCV version**: Ensure OpenCV >= 4.0 for DNN support
3. **Memory errors**: System needs at least 512 MB available RAM

### Performance Optimization

1. **GPU acceleration**: Install OpenCV with CUDA support
2. **Model quantization**: Use INT8 version for faster inference
3. **Input scaling**: Resize large images before processing

For support, check the main project documentation or create an issue.