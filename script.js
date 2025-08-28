class SVGSpritesheetBuilder {
    constructor() {
        this.uploadedImages = [];
        this.initializeElements();
        this.bindEvents();
    }

    initializeElements() {
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.browseBtn = document.getElementById('browseBtn');
        this.gallerySection = document.getElementById('gallerySection');
        this.imageGrid = document.getElementById('imageGrid');
        this.clearBtn = document.getElementById('clearBtn');
        this.configSection = document.getElementById('configSection');
        this.previewSection = document.getElementById('previewSection');
        this.previewCanvas = document.getElementById('previewCanvas');
        this.cssCode = document.getElementById('cssCode');
        this.toast = document.getElementById('toast');
        
        // Configuration inputs
        this.spriteName = document.getElementById('spriteName');
        this.customWidth = document.getElementById('customWidth');
        this.customHeight = document.getElementById('customHeight');
        this.spacing = document.getElementById('spacing');
        this.columns = document.getElementById('columns');
        this.sizingModeRadios = document.querySelectorAll('input[name="sizingMode"]');
        this.customSizeGroup = document.getElementById('customSizeGroup');
        
        // Download buttons
        this.downloadSvg = document.getElementById('downloadSvg');
        this.downloadCss = document.getElementById('downloadCss');
        this.downloadZip = document.getElementById('downloadZip');
        
        // Range value displays
        this.updateRangeValues();
    }

    bindEvents() {
        // Upload events
        this.uploadArea.addEventListener('click', () => this.fileInput.click());
        this.browseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.fileInput.click();
        });
        this.fileInput.addEventListener('change', (e) => this.handleFiles(e.target.files));
        
        // Drag and drop
        this.uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
        this.uploadArea.addEventListener('dragleave', this.handleDragLeave.bind(this));
        this.uploadArea.addEventListener('drop', this.handleDrop.bind(this));
        
        // Clear button
        this.clearBtn.addEventListener('click', this.clearAllImages.bind(this));
        
        // Configuration changes
        this.spriteName.addEventListener('input', this.generatePreview.bind(this));
        this.customWidth.addEventListener('change', this.generatePreview.bind(this));
        this.customHeight.addEventListener('change', this.generatePreview.bind(this));
        this.spacing.addEventListener('input', this.generatePreview.bind(this));
        this.columns.addEventListener('input', this.generatePreview.bind(this));
        
        // Sizing mode radio buttons
        this.sizingModeRadios.forEach(radio => {
            radio.addEventListener('change', this.handleSizingModeChange.bind(this));
        });

        // Show/hide custom size group on load
        window.addEventListener('DOMContentLoaded', () => {
            const checkedRadio = document.querySelector('input[name="sizingMode"]:checked');
            this.customSizeGroup.style.display = checkedRadio.value === 'custom' ? 'flex' : 'none';
        });
        
        // Range value updates
        this.spacing.addEventListener('input', () => this.updateRangeValue('spacing'));
        this.columns.addEventListener('input', () => this.updateRangeValue('columns'));
        
        // Download buttons
        this.downloadSvg.addEventListener('click', this.downloadSVG.bind(this));
        this.downloadCss.addEventListener('click', this.downloadCSS.bind(this));
        this.downloadZip.addEventListener('click', this.downloadZIP.bind(this));
    }

    updateRangeValues() {
        this.updateRangeValue('spacing');
        this.updateRangeValue('columns');
    }

    updateRangeValue(id) {
        const input = document.getElementById(id);
        const valueSpan = input.nextElementSibling;
        const unit = id === 'spacing' ? 'px' : '';
        valueSpan.textContent = input.value + unit;
    }

    handleSizingModeChange() {
        const selectedMode = document.querySelector('input[name="sizingMode"]:checked').value;
        const isCustom = selectedMode === 'custom';
        this.customSizeGroup.style.display = isCustom ? 'flex' : 'none';
        this.generatePreview();
    }

    getSelectedSizingMode() {
        return document.querySelector('input[name="sizingMode"]:checked').value;
    }

    handleDragOver(e) {
        e.preventDefault();
        this.uploadArea.classList.add('drag-over');
    }

    handleDragLeave(e) {
        e.preventDefault();
        this.uploadArea.classList.remove('drag-over');
    }

    handleDrop(e) {
        e.preventDefault();
        this.uploadArea.classList.remove('drag-over');
        const files = Array.from(e.dataTransfer.files).filter(file => 
            file.type.startsWith('image/') || file.type === 'image/svg+xml'
        );
        this.handleFiles(files);
    }

    async handleFiles(files) {
        if (!files || files.length === 0) return;
        
        this.showToast('Processing images...', 'info');
        
        for (const file of files) {
            if (this.isValidImageFile(file)) {
                await this.processImage(file);
            } else {
                this.showToast(`Invalid file type: ${file.name}`, 'error');
            }
        }
        
        this.updateUI();
        this.showToast(`Added ${files.length} image${files.length > 1 ? 's' : ''}`, 'success');
    }

    isValidImageFile(file) {
        const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/svg+xml'];
        return validTypes.includes(file.type);
    }

    async processImage(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const imageData = {
                    id: Date.now() + Math.random(),
                    name: this.sanitizeFileName(file.name),
                    originalName: file.name,
                    data: e.target.result,
                    type: file.type,
                    size: file.size,
                    width: null,
                    height: null
                };
                
                // Detect dimensions based on file type
                if (file.type === 'image/svg+xml') {
                    const dimensions = await this.getSVGDimensions(e.target.result);
                    imageData.width = dimensions.width;
                    imageData.height = dimensions.height;
                } else {
                    const dimensions = await this.getRasterImageDimensions(e.target.result);
                    imageData.width = dimensions.width;
                    imageData.height = dimensions.height;
                }
                
                this.uploadedImages.push(imageData);
                resolve();
            };
            reader.readAsDataURL(file);
        });
    }

    sanitizeFileName(fileName) {
        return fileName
            .replace(/\.[^/.]+$/, '') // Remove extension
            .replace(/[^a-zA-Z0-9]/g, '_') // Replace non-alphanumeric with underscore
            .toLowerCase();
    }

    async getSVGDimensions(dataUrl) {
        return new Promise((resolve) => {
            try {
                const base64 = dataUrl.split(',')[1];
                const svgString = atob(base64);
                const parser = new DOMParser();
                const doc = parser.parseFromString(svgString, 'image/svg+xml');
                const svg = doc.querySelector('svg');
                
                if (svg) {
                    const width = svg.getAttribute('width');
                    const height = svg.getAttribute('height');
                    const viewBox = svg.getAttribute('viewBox');
                    
                    let dimensions = { width: 24, height: 24 }; // Default fallback
                    
                    if (width && height) {
                        dimensions = {
                            width: parseInt(width) || 24,
                            height: parseInt(height) || 24
                        };
                    } else if (viewBox) {
                        const values = viewBox.split(' ');
                        if (values.length >= 4) {
                            dimensions = {
                                width: parseInt(values[2]) || 24,
                                height: parseInt(values[3]) || 24
                            };
                        }
                    }
                    
                    resolve(dimensions);
                } else {
                    resolve({ width: 24, height: 24 });
                }
            } catch (error) {
                console.error('Error parsing SVG dimensions:', error);
                resolve({ width: 24, height: 24 });
            }
        });
    }

    async getRasterImageDimensions(dataUrl) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                resolve({
                    width: img.naturalWidth,
                    height: img.naturalHeight
                });
            };
            img.onerror = () => {
                resolve({ width: 24, height: 24 });
            };
            img.src = dataUrl;
        });
    }

    updateUI() {
        if (this.uploadedImages.length > 0) {
            this.gallerySection.style.display = 'block';
            this.configSection.style.display = 'block';
            this.renderImageGrid();
            this.generatePreview();
        } else {
            this.gallerySection.style.display = 'none';
            this.configSection.style.display = 'none';
            this.previewSection.style.display = 'none';
        }
    }

    renderImageGrid() {
        this.imageGrid.innerHTML = '';
        
        this.uploadedImages.forEach(image => {
            const imageItem = document.createElement('div');
            imageItem.className = 'image-item';
            
            imageItem.innerHTML = `
                <img src="${image.data}" alt="${image.originalName}" class="image-preview">
                <div class="image-name">${image.originalName}</div>
                <div class="image-dimensions">${image.width}×${image.height}px</div>
                <button class="remove-btn" data-id="${image.id}">×</button>
            `;
            
            const removeBtn = imageItem.querySelector('.remove-btn');
            removeBtn.addEventListener('click', () => this.removeImage(image.id));
            
            this.imageGrid.appendChild(imageItem);
        });
    }

    removeImage(imageId) {
        this.uploadedImages = this.uploadedImages.filter(img => img.id !== imageId);
        this.updateUI();
        this.showToast('Image removed', 'info');
    }

    clearAllImages() {
        this.uploadedImages = [];
        this.updateUI();
        this.showToast('All images cleared', 'info');
    }

    async generatePreview() {
        if (this.uploadedImages.length === 0) return;
        
        const sizingMode = this.getSelectedSizingMode();
        let width, height;
        if (sizingMode === 'custom') {
            width = parseInt(this.customWidth.value, 10);
            height = parseInt(this.customHeight.value, 10);
        }

        const config = {
            name: this.spriteName.value || 'sprite',
            width: width,
            height: height,
            spacing: parseInt(this.spacing.value),
            columns: parseInt(this.columns.value),
            sizingMode: sizingMode
        };
        
        try {
            const { svg, css } = await this.createSpritesheet(config);
            
            this.previewCanvas.innerHTML = svg;
            this.cssCode.textContent = css;
            this.previewSection.style.display = 'block';
            
            // Store generated content for downloads
            this.generatedSvg = svg;
            this.generatedCss = css;
            
        } catch (error) {
            console.error('Error generating preview:', error);
            this.showToast('Error generating preview', 'error');
        }
    }

    async createSpritesheet(config) {
        const { name, width, height, spacing, columns, sizingMode } = config;
        const images = this.uploadedImages;
        
        let processedImages;
        let spriteWidth;
        let spriteHeight;
        
        if (sizingMode === 'original') {
            // Use original dimensions layout
            processedImages = await this.calculateOriginalDimensionsLayout(images, spacing, columns, name);
            const bounds = this.calculateSpriteBounds(processedImages, spacing);
            spriteWidth = bounds.width;
            spriteHeight = bounds.height;
        } else if (sizingMode === 'custom') {
            // Use custom width/height layout
            processedImages = await this.calculateCustomLayout(images, width, height, spacing, columns, name);
            const rows = Math.ceil(images.length / columns);
            spriteWidth = (width * columns) + (spacing * (columns - 1));
            spriteHeight = (height * rows) + (spacing * (rows - 1));
        }
        
        // Create SVG sprite
        let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${spriteWidth}" height="${spriteHeight}" viewBox="0 0 ${spriteWidth} ${spriteHeight}">`;
        
        // Add each processed image
        processedImages.forEach(img => {
            if (img.content) {
                svgContent += img.content;
            }
        });
        
        // Add view elements for each sprite (for easy reference)
        processedImages.forEach(img => {
            svgContent += `<view id="${name}-${img.name}-view" viewBox="${img.x} ${img.y} ${img.width} ${img.height}"/>`;
        });
        
        svgContent += `</svg>`;
        
        // Generate CSS
        const css = this.generateCSS(name, processedImages, config);
        
        return { svg: svgContent, css };
    }

    async calculateOriginalDimensionsLayout(images, spacing, columns, spriteName) {
        const processedImages = [];
        let currentX = 0;
        let currentY = 0;
        let rowHeight = 0;
        let currentColumn = 0;

        for (let index = 0; index < images.length; index++) {
            const image = images[index];
            const width = image.width || 24;
            const height = image.height || 24;

            // Check if we need to start a new row
            if (currentColumn >= columns) {
                currentX = 0;
                currentY += rowHeight + spacing;
                rowHeight = 0;
                currentColumn = 0;
            }

            let imageContent = '';
            
            if (image.type === 'image/svg+xml') {
                // Handle SVG files with original dimensions
                const svgDoc = this.parseSVG(image.data);
                if (svgDoc) {
                    imageContent = `<g id="${spriteName}-${image.name}" transform="translate(${currentX}, ${currentY})">
                        <g>${svgDoc}</g>
                    </g>`;
                }
            } else {
                // Handle raster images with original dimensions - use width/height attributes
                imageContent = `<image id="${spriteName}-${image.name}" x="${currentX}" y="${currentY}" width="${width}" height="${height}" href="${image.data}" preserveAspectRatio="xMidYMid meet"/>`;
            }

            processedImages.push({
                name: image.name,
                x: currentX,
                y: currentY,
                width: width,
                height: height,
                index: index,
                content: imageContent
            });

            // Update position for next image
            currentX += width + spacing;
            rowHeight = Math.max(rowHeight, height);
            currentColumn++;
        }

        return processedImages;
    }

    async calculateCustomLayout(images, width, height, spacing, columns, spriteName) {
        return await Promise.all(
            images.map(async (image, index) => {
                const row = Math.floor(index / columns);
                const col = index % columns;
                const x = col * (width + spacing);
                const y = row * (height + spacing);
                
                let imageContent = '';
                
                if (image.type === 'image/svg+xml') {
                    // Handle SVG files
                    const svgDoc = this.parseSVG(image.data);
                    if (svgDoc) {
                        // Scale SVG to fit width/height
                        imageContent = `<g id="${spriteName}-${image.name}" transform="translate(${x}, ${y})">
                            <g transform="scale(${width / 24}, ${height / 24})">${svgDoc}</g>
                        </g>`;
                    }
                } else {
                    // Handle raster images with custom size - use width/height attributes
                    imageContent = `<image id="${spriteName}-${image.name}" x="${x}" y="${y}" width="${width}" height="${height}" href="${image.data}" preserveAspectRatio="xMidYMid meet"/>`;
                }
                
                return {
                    name: image.name,
                    x, y, 
                    width: width,
                    height: height,
                    index,
                    content: imageContent
                };
            })
        );
    }

    calculateSpriteBounds(processedImages, spacing) {
        if (processedImages.length === 0) {
            return { width: 0, height: 0 };
        }

        let maxX = 0;
        let maxY = 0;

        processedImages.forEach(img => {
            const rightEdge = img.x + img.width;
            const bottomEdge = img.y + img.height;
            maxX = Math.max(maxX, rightEdge);
            maxY = Math.max(maxY, bottomEdge);
        });

        return {
            width: maxX,
            height: maxY
        };
    }

    parseSVG(dataUrl) {
        try {
            const base64 = dataUrl.split(',')[1];
            const svgString = atob(base64);
            const parser = new DOMParser();
            const doc = parser.parseFromString(svgString, 'image/svg+xml');
            const svg = doc.querySelector('svg');
            
            if (svg) {
                // Remove the outer svg tag and return inner content
                return svg.innerHTML;
            }
        } catch (error) {
            console.error('Error parsing SVG:', error);
        }
        return null;
    }

    generateCSS(spriteName, images, config) {
        const { sizingMode } = config;
        
        let css = `/* SVG Sprite CSS */\n.${spriteName} {\n    display: inline-block;\n    background-image: url('${spriteName}.svg');\n    background-size: auto;\n    background-repeat: no-repeat;\n}\n\n`;
        
        images.forEach(img => {
            const sizeCSS = `    width: ${img.width}px;\n    height: ${img.height}px;`;
            css += `.${spriteName}-${img.name} {\n${sizeCSS}\n    background-position: -${img.x}px -${img.y}px;\n}\n\n`;
        });
        
        return css;
    }

    downloadSVG() {
        if (!this.generatedSvg) return;
        
        const blob = new Blob([this.generatedSvg], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.spriteName.value || 'sprite'}.svg`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.showToast('SVG downloaded successfully', 'success');
    }

    downloadCSS() {
        if (!this.generatedCss) return;
        
        const blob = new Blob([this.generatedCss], { type: 'text/css' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.spriteName.value || 'sprite'}.css`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.showToast('CSS downloaded successfully', 'success');
    }

    async downloadZIP() {
        if (!this.generatedSvg || !this.generatedCss) return;
        
        try {
            // For now, download files separately
            // In a production app, you'd use a proper ZIP library
            this.downloadSVG();
            setTimeout(() => this.downloadCSS(), 500);
            
            this.showToast('Files downloaded (SVG + CSS)', 'success');
            
        } catch (error) {
            console.error('Error creating ZIP:', error);
            this.showToast('Error creating download package', 'error');
        }
    }

    generateReadme(spriteName) {
        return `# ${spriteName} Sprite

This sprite was generated using SVG Spritesheet Builder.

## Usage

1. Include the CSS file in your project:
   \`\`\`html
   <link rel="stylesheet" href="${spriteName}.css">
   \`\`\`

2. Use the sprite in your HTML:
   \`\`\`html
   <i class="${spriteName} ${spriteName}-iconname"></i>
   \`\`\`

## Available Icons

${this.uploadedImages.map(img => `- ${spriteName}-${img.name}`).join('\n')}

Generated on: ${new Date().toISOString()}
`;
    }

    showToast(message, type = 'info') {
        this.toast.textContent = message;
        this.toast.className = `toast ${type}`;
        this.toast.classList.add('show');
        
        setTimeout(() => {
            this.toast.classList.remove('show');
        }, 3000);
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new SVGSpritesheetBuilder();
});

// Add some utility functions for better user experience
window.addEventListener('beforeunload', (e) => {
    const builder = window.spritesheetBuilder;
    if (builder && builder.uploadedImages.length > 0) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
    }
});

// Prevent default drag and drop on the document
document.addEventListener('dragover', (e) => {
    e.preventDefault();
});

document.addEventListener('drop', (e) => {
    e.preventDefault();
});

