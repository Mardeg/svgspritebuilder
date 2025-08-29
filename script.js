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
        this.htmlCode = document.getElementById('htmlCode'); // New for example HTML output
        this.toast = document.getElementById('toast');
        // Config inputs
        this.spriteName = document.getElementById('spriteName');
        this.customWidth = document.getElementById('customWidth');
        this.customHeight = document.getElementById('customHeight');
        this.spacing = document.getElementById('spacing');
        this.columns = document.getElementById('columns');
        this.sizingModeRadios = document.querySelectorAll('input[name="sizingMode"]');
        this.customSizeGroup = document.getElementById('customSizeGroup');
        // Download button
        this.downloadSvg = document.getElementById('downloadSvg');
        this.bgU = document.getElementById('bgU');
        this.iSRC = document.getElementById('iSRC');
        // Range value displays
        this.updateRangeValues();
    }

    bindEvents() {
        this.uploadArea.addEventListener('click', () => this.fileInput.click());
        this.browseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.fileInput.click();
        });
        this.fileInput.addEventListener('change', (e) => this.handleFiles(e.target.files));
        this.uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
        this.uploadArea.addEventListener('dragleave', this.handleDragLeave.bind(this));
        this.uploadArea.addEventListener('drop', this.handleDrop.bind(this));
        this.clearBtn.addEventListener('click', this.clearAllImages.bind(this));
        this.spriteName.addEventListener('input', this.generatePreview.bind(this));
        this.customWidth.addEventListener('input', this.generatePreview.bind(this));
        this.customHeight.addEventListener('input', this.generatePreview.bind(this));
        this.spacing.addEventListener('input', this.generatePreview.bind(this));
        this.columns.addEventListener('input', this.generatePreview.bind(this));
        this.sizingModeRadios.forEach(radio => {
            radio.addEventListener('change', this.handleSizingModeChange.bind(this));
        });
    window.addEventListener('DOMContentLoaded', () => {
        const checkedRadio = document.querySelector('input[name="sizingMode"]:checked');
    // Always show the group
        this.customSizeGroup.style.display = 'flex';
    // Disable if not custom
        const shouldDisable = checkedRadio.value !== 'custom';
        this.customWidth.disabled = shouldDisable;
        this.customHeight.disabled = shouldDisable;
});
        this.spacing.addEventListener('input', () => this.updateRangeValue('spacing'));
        this.columns.addEventListener('input', () => this.updateRangeValue('columns'));
        this.downloadSvg.addEventListener('click', this.downloadSVG.bind(this));
        const previewButtons = document.querySelectorAll('.code-preview-btn');
        previewButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                previewButtons.forEach(b => {
                    b.classList.remove('btn-primary');
                    b.classList.add('btn-secondary');
                });
                btn.classList.remove('btn-secondary');
                btn.classList.add('btn-primary');
                if (btn.id === 'bgU') this.bgURL();
                if (btn.id === 'iSRC') this.imgSRC();
            });
        });
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
    // Disable width/height inputs instead of hiding their group
        const shouldDisable = selectedMode !== 'custom';
        this.customWidth.disabled = shouldDisable;
        this.customHeight.disabled = shouldDisable;
    // Always show the customSizeGroup so layout remains stable
        this.customSizeGroup.style.display = 'flex';
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
        return fileName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
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
                    let dimensions = { width: 24, height: 24 };
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
            if (this.htmlCode) this.htmlCode.textContent = '';
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

    async generatePreview(previewMode = 'bgURL') {
        if (this.uploadedImages.length === 0) return;
        const sizingMode = this.getSelectedSizingMode();
        let width, height;
        if (sizingMode === 'custom') {
            width = Math.max(16, Math.min(1600, parseInt(this.customWidth.value, 10) || 24));
            height = Math.max(16, Math.min(1600, parseInt(this.customHeight.value, 10) || 24));
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
            const { svg, css, htmlExamples } = await this.createSpritesheet(config,previewMode);
            this.previewCanvas.innerHTML = svg;
            this.cssCode.textContent = css;
            this.previewSection.style.display = 'block';
            this.generatedSvg = svg;
            this.generatedCss = css;
            if (this.htmlCode && htmlExamples) {
                this.htmlCode.textContent = htmlExamples;
            }
        } catch (error) {
            console.error('Error generating preview:', error);
            this.showToast('Error generating preview', 'error');
        }
    }

    async createSpritesheet(config,previewMode) {
        const { name, width, height, spacing, columns, sizingMode } = config;
        const images = this.uploadedImages;
        let processedImages;
        let spriteWidth;
        let spriteHeight;

        if (sizingMode === 'original') {
            processedImages = await this.calculateOriginalDimensionsLayout(images, spacing, columns, name);
            const bounds = this.calculateSpriteBounds(processedImages, spacing);
            spriteWidth = bounds.width;
            spriteHeight = bounds.height;
        } else if (sizingMode === 'custom') {
            processedImages = await this.calculateCustomLayout(images, width, height, spacing, columns, name);
            const rows = Math.ceil(images.length / columns);
            spriteWidth = (width * columns) + (spacing * (columns - 1));
            spriteHeight = (height * rows) + (spacing * (rows - 1));
        }

        // SVG with <view> elements for fragment identifiers
        let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${spriteWidth}" height="${spriteHeight}" viewBox="0 0 ${spriteWidth} ${spriteHeight}">`;

        processedImages.forEach(img => {
            if (img.content) svgContent += img.content;
        });

        processedImages.forEach(img => {
            svgContent += `<view id="${img.id}" viewBox="${img.x} ${img.y} ${img.width} ${img.height}"/>`;
        });

        svgContent += `</svg>`;

        const css = this.generateCSS(name, processedImages, config, previewMode);

        // Generate example HTML code
        let htmlExamples = '';
        if (previewMode === 'imgSRC') {
            htmlExamples = processedImages.map(img =>
                `<img width="${img.width}" height="${img.height}" src="${name}.svg#${img.id}">`
        ).join('\n');
        } else {
            htmlExamples = processedImages.map(img =>
                `<a class="${name}-${img.name} ${name}" href="${name}.svg#${img.id}" style="--vg:url(${name}.svg#${img.id})">&#8203;</a>`
            ).join('\n');
        }
        return { svg: svgContent, css, htmlExamples };
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
            const id = (index + 1).toString().padStart(2, '0'); // "01", "02", ...
            if (currentColumn >= columns) {
                currentX = 0;
                currentY += rowHeight + spacing;
                rowHeight = 0;
                currentColumn = 0;
            }
            let imageContent = '';
            if (image.type === 'image/svg+xml') {
                const svgDoc = this.parseSVG(image.data);
                if (svgDoc) {
                    imageContent = `<g transform="translate(${currentX}, ${currentY})"><g>${svgDoc}</g></g>`;
                }
            } else {
                imageContent = `<image x="${currentX}" y="${currentY}" width="${width}" height="${height}" href="${image.data}" preserveAspectRatio="xMidYMid meet"/>`;
            }
            processedImages.push({
                name: image.name,
                id,
                x: currentX,
                y: currentY,
                width: width,
                height: height,
                index: index,
                content: imageContent
            });
            currentX += width + spacing;
            rowHeight = Math.max(rowHeight, height);
            currentColumn++;
        }
        return processedImages;
    }

    async calculateCustomLayout(images, width, height, spacing, columns, spriteName) {
        return await Promise.all(
            images.map((image, index) => {
                const row = Math.floor(index / columns);
                const col = index % columns;
                const x = col * (width + spacing);
                const y = row * (height + spacing);
                const id = (index + 1).toString().padStart(2, '0');
                let imageContent = '';
                if (image.type === 'image/svg+xml') {
                    const svgDoc = this.parseSVG(image.data);
                    if (svgDoc) {
                        imageContent = `<g transform="translate(${x}, ${y})"><g transform="scale(${width / 24}, ${height / 24})">${svgDoc}</g></g>`;
                    }
                } else {
                    imageContent = `<image x="${x}" y="${y}" width="${width}" height="${height}" href="${image.data}" preserveAspectRatio="xMidYMid meet"/>`;
                }
                return {
                    name: image.name,
                    id,
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
        return { width: maxX, height: maxY };
    }

    parseSVG(dataUrl) {
        try {
            const base64 = dataUrl.split(',')[1];
            const svgString = atob(base64);
            const parser = new DOMParser();
            const doc = parser.parseFromString(svgString, 'image/svg+xml');
            const svg = doc.querySelector('svg');
            if (svg) return svg.innerHTML;
        } catch (error) {
            console.error('Error parsing SVG:', error);
        }
        return null;
    }

    generateCSS(spriteName, images, config, previewMode) {
        let css = '';
        const { sizingMode, width, height } = config;
        if (previewMode === 'imgSRC') {
            css += `/* No CSS needed */\n`;
        } else {
            if (sizingMode === "custom") {
                css += `/* SVG Sprite CSS for Custom size mode */\n`;
                css += `[class$="${spriteName}-"] {\n    width: ${width}px;\n    height: ${height}px;\n    background: cover no-repeat var(--vg);\n}\n\n`;
                css += `/* Example usage: Each element must set --vg style for its fragment. */\n`;
            } else {
                css += `/* SVG Sprite CSS using <view> fragments */\n.${spriteName} {\n    display: inline-block;\n}\n\n`;
                images.forEach(img => {
                    css += `.${spriteName}-${img.name} {\n    width: ${img.width}px;\n    height: ${img.height}px;\n\n`;
                });
            }
        }
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

    bgURL(spriteName, images, config) {
        
        this.generatePreview('bgURL');
    }

    imgSRC(spriteName, images, config) {
        this.generatePreview('imgSRC');
    }

    generateReadme(spriteName) {
        return `# ${spriteName} Sprite

This sprite was generated using SVG Spritesheet Builder.

## Usage

1. Include the CSS code (if needed) in your project.

2. Use the sprite in your HTML:
   \`\`\`html
   <a class="${spriteName}-iconname ${spriteName}" href="${spriteName}.svg#i01" style="--vg:url(${spriteName}.svg#i01)">&#8203;</a>
   <img src="${spriteName}.svg#01">
   \`\`\`

## Available Icons

${this.uploadedImages.map((img, i) => `- ${spriteName}-${img.name} (fragment: #${(i+1).toString().padStart(2,'0')})`).join('\n')}

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

document.addEventListener('DOMContentLoaded', () => {
    new SVGSpritesheetBuilder();
});

window.addEventListener('beforeunload', (e) => {
    const builder = window.spritesheetBuilder;
    if (builder && builder.uploadedImages.length > 0) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
    }
});
document.addEventListener('dragover', (e) => {
    e.preventDefault();
});
document.addEventListener('drop', (e) => {
    e.preventDefault();
});
