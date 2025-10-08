// PDF Editor with Drawing Functionality
document.addEventListener('DOMContentLoaded', function() {
    // Use the variables passed from the Flask template
    // These are defined in the HTML template as: projectId and pdfFilename
    const pid = projectId;
    const filename = pdfFilename;
    
    // Update the UI with the filename
    document.querySelector('.project-item.active').textContent = `Editing: ${filename}`;
    
    // Canvas setup
    const canvas = document.getElementById('pdfCanvas');
    const ctx = canvas.getContext('2d');
    let pdfDoc = null;
    let currentPage = 1;
    let scale = 1.5;
    let pdfData = null;
    
    // Drawing state
    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;
    let drawMode = 'scroll'; // Default mode
    let drawColor = '#5c6bc0'; // Default color
    let shapes = []; // Store all shapes for undo/redo
    let currentShape = null;
    let undoStack = [];
    let redoStack = [];
    
    // Load the PDF
    loadPDF();
    
    // Set up event listeners
    setupEventListeners();
    
    // Function to load the PDF
    function loadPDF() {
        // Try to load the project PDF first, fall back to sample if needed
        const projectPdfUrl = `/api/projects/${pid}/files/${filename}`;
        const samplePdfUrl = `/sample.pdf`;
        
        // Show loading message
        document.querySelector('.placeholder-text').style.display = 'block';
        
        // First try to load the project PDF
        pdfjsLib.getDocument(projectPdfUrl).promise
            .then(function(pdf) {
                pdfDoc = pdf;
                renderPage(currentPage);
                document.querySelector('.placeholder-text').style.display = 'none';
            })
            .catch(function(error) {
                console.log('Project PDF not found, loading sample PDF instead:', error);
                // If project PDF fails, load the sample PDF
                return pdfjsLib.getDocument(samplePdfUrl).promise;
            })
            .then(function(pdf) {
                if (!pdfDoc) { // Only set if not already set by the first promise
                    pdfDoc = pdf;
                    renderPage(currentPage);
                    document.querySelector('.placeholder-text').style.display = 'none';
                }
            })
            .catch(function(error) {
                console.error('Error loading PDF:', error);
                document.querySelector('.placeholder-text').textContent = 'Error loading PDF. Please try again.';
            });
    }
    
    // Function to render a page
    function renderPage(pageNumber) {
        pdfDoc.getPage(pageNumber).then(function(page) {
            const viewport = page.getViewport({ scale });
            
            // Set canvas dimensions to match the PDF page
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            
            // Render the PDF page
            const renderContext = {
                canvasContext: ctx,
                viewport: viewport
            };
            
            page.render(renderContext).promise.then(function() {
                // Redraw all shapes after rendering the page
                redrawShapes();
            });
        });
    }
    
    // Function to set up event listeners
    function setupEventListeners() {
        // Tool selection
        const toolButtons = document.querySelectorAll('.tool-btn');
        toolButtons.forEach(button => {
            button.addEventListener('click', function() {
                // Remove active class from all buttons
                toolButtons.forEach(btn => btn.classList.remove('active'));
                // Add active class to clicked button
                this.classList.add('active');
                // Set draw mode
                drawMode = this.title.toLowerCase();
            });
        });
        
        // Color picker
        const colorPicker = document.getElementById('colorPicker');
        colorPicker.addEventListener('change', function() {
            drawColor = this.value;
        });
        
        // Canvas drawing events
        canvas.addEventListener('mousedown', startDrawing);
        canvas.addEventListener('mousemove', draw);
        canvas.addEventListener('mouseup', stopDrawing);
        canvas.addEventListener('mouseout', stopDrawing);
        
        // Undo/Redo buttons
        document.querySelector('.fa-undo').parentElement.addEventListener('click', undo);
        document.querySelector('.fa-redo').parentElement.addEventListener('click', redo);
        
        // Delete button
        document.getElementById('deleteBtn').addEventListener('click', deleteSelected);
        
        // Save button
        document.getElementById('saveFileBtn').addEventListener('click', saveFile);
        
        // Back button
        document.getElementById('backToImportBtn').addEventListener('click', function() {
            window.location.href = '/';
        });
    }
    
    // Drawing functions
    function startDrawing(e) {
        if (drawMode === 'scroll') return;
        
        isDrawing = true;
        const rect = canvas.getBoundingClientRect();
        lastX = e.clientX - rect.left;
        lastY = e.clientY - rect.top;
        
        // Create a new shape based on the current mode
        currentShape = {
            type: drawMode,
            color: drawColor,
            points: [{ x: lastX, y: lastY }],
            startX: lastX,
            startY: lastY
        };
    }
    
    function draw(e) {
        if (!isDrawing || drawMode === 'scroll') return;
        
        const rect = canvas.getBoundingClientRect();
        const currentX = e.clientX - rect.left;
        const currentY = e.clientY - rect.top;
        
        // Clear the canvas and redraw the PDF
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        renderPage(currentPage);
        
        // Update the current shape based on the draw mode
        if (drawMode === 'free draw') {
            currentShape.points.push({ x: currentX, y: currentY });
        } else if (drawMode === 'rectangle') {
            currentShape.width = currentX - currentShape.startX;
            currentShape.height = currentY - currentShape.startY;
        } else if (drawMode === 'text') {
            // For text, we just need the position
            currentShape.text = prompt('Enter text:', '');
            if (currentShape.text) {
                currentShape.type = 'text';
            } else {
                isDrawing = false;
                currentShape = null;
                return;
            }
        }
        
        // Draw all shapes including the current one
        redrawShapes();
        drawShape(currentShape);
        
        lastX = currentX;
        lastY = currentY;
    }
    
    function stopDrawing() {
        if (!isDrawing) return;
        
        isDrawing = false;
        
        // Add the current shape to the shapes array
        if (currentShape) {
            shapes.push(currentShape);
            undoStack.push({ action: 'add', shape: currentShape });
            redoStack = []; // Clear redo stack after a new action
            currentShape = null;
        }
    }
    
    function redrawShapes() {
        // Redraw all shapes
        shapes.forEach(shape => {
            drawShape(shape);
        });
    }
    
    function drawShape(shape) {
        ctx.strokeStyle = shape.color;
        ctx.fillStyle = shape.color;
        ctx.lineWidth = 2;
        
        if (shape.type === 'free draw') {
            ctx.beginPath();
            ctx.moveTo(shape.points[0].x, shape.points[0].y);
            
            for (let i = 1; i < shape.points.length; i++) {
                ctx.lineTo(shape.points[i].x, shape.points[i].y);
            }
            
            ctx.stroke();
        } else if (shape.type === 'rectangle') {
            ctx.beginPath();
            ctx.rect(shape.startX, shape.startY, shape.width, shape.height);
            ctx.stroke();
        } else if (shape.type === 'text') {
            ctx.font = '16px Arial';
            ctx.fillText(shape.text, shape.startX, shape.startY);
        }
    }
    
    // Undo/Redo functions
    function undo() {
        if (undoStack.length === 0) return;
        
        const action = undoStack.pop();
        redoStack.push(action);
        
        if (action.action === 'add') {
            // Remove the last shape
            shapes.pop();
        } else if (action.action === 'delete') {
            // Add back the deleted shape
            shapes.push(action.shape);
        }
        
        // Redraw the canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        renderPage(currentPage);
    }
    
    function redo() {
        if (redoStack.length === 0) return;
        
        const action = redoStack.pop();
        undoStack.push(action);
        
        if (action.action === 'add') {
            // Add back the shape
            shapes.push(action.shape);
        } else if (action.action === 'delete') {
            // Remove the shape again
            const index = shapes.findIndex(s => s === action.shape);
            if (index !== -1) {
                shapes.splice(index, 1);
            }
        }
        
        // Redraw the canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        renderPage(currentPage);
    }
    
    // Delete function
    function deleteSelected() {
        // For simplicity, just delete the last shape
        if (shapes.length > 0) {
            const deletedShape = shapes.pop();
            undoStack.push({ action: 'delete', shape: deletedShape });
            redoStack = []; // Clear redo stack after a new action
            
            // Redraw the canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            renderPage(currentPage);
        }
    }
    
    // Save function
    function saveFile() {
        // Create a temporary canvas to combine the PDF and drawings
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        
        // Draw the current canvas content to the temporary canvas
        tempCtx.drawImage(canvas, 0, 0);
        
        // Convert the canvas to a data URL
        const dataURL = tempCanvas.toDataURL('image/png');
        
        // Send the data URL to the server
        fetch(`/api/projects/${pid}/save-pdf`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                pdfData: dataURL,
                filename: filename
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('File saved successfully!');
            } else {
                alert('Error saving file: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error saving file:', error);
            alert('Error saving file. Please try again.');
        });
    }
});