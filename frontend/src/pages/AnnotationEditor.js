import React, { useRef, useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import * as pdfjsLib from "pdfjs-dist";
import html2canvas from "html2canvas";

// Use stable PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.269/pdf.worker.min.js`;

const AnnotationEditor = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const { fileName, filePath, projectId = "default_project_1" } = location.state || {};

    const pdfCanvasRef = useRef(null);
    const overlayRef = useRef(null);
    const canvasWrapperRef = useRef(null);

    const [currentTool, setCurrentTool] = useState("pan");
    const [currentColor, setCurrentColor] = useState("#5c6bc0");
    const [currentStrokeWidth, setCurrentStrokeWidth] = useState(4);
    const [scaleRatio, setScaleRatio] = useState(0.05);
    const [currentZoom, setCurrentZoom] = useState(1.0);

    const [measurementPoints, setMeasurementPoints] = useState([]);
    const [isDrawing, setIsDrawing] = useState(false);
    const [startX, setStartX] = useState(0);
    const [startY, setStartY] = useState(0);
    const [lastX, setLastX] = useState(0);
    const [lastY, setLastY] = useState(0);

    const [historyStack, setHistoryStack] = useState([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    // --- Utility Functions ---
    const getCanvasCoords = useCallback(
        (e) => {
            const rect = overlayRef.current.getBoundingClientRect();
            const x = (e.clientX - rect.left) / currentZoom;
            const y = (e.clientY - rect.top) / currentZoom;
            return { x, y };
        },
        [currentZoom]
    );

    const redrawHistory = useCallback(
        (index) => {
            const ctx = overlayRef.current.getContext("2d");
            ctx.clearRect(0, 0, overlayRef.current.width, overlayRef.current.height);
            if (index >= 0) {
                const img = new Image();
                img.onload = () => ctx.drawImage(img, 0, 0);
                img.src = historyStack[index];
            }
        },
        [historyStack]
    );

    const saveHistory = useCallback(() => {
        const newStack = historyStack.slice(0, historyIndex + 1);
        const newData = overlayRef.current.toDataURL();
        setHistoryStack([...newStack, newData]);
        setHistoryIndex(newStack.length);
    }, [historyStack, historyIndex]);

    const handleUndo = () => historyIndex > -1 && setHistoryIndex((prev) => prev - 1);
    const handleRedo = () => historyIndex < historyStack.length - 1 && setHistoryIndex((prev) => prev + 1);

    useEffect(() => {
        if (overlayRef.current) redrawHistory(historyIndex);
    }, [historyIndex, redrawHistory]);

    const calculateDistance = (p1, p2) => {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const distancePx = Math.sqrt(dx * dx + dy * dy);
        return (distancePx * scaleRatio).toFixed(2);
    };

    const drawMeasurementText = (ctx, start, end, distance) => {
        const midX = (start.x + end.x) / 2;
        const midY = (start.y + end.y) / 2;
        const angleRad = Math.atan2(end.y - start.y, end.x - start.x);

        ctx.save();
        ctx.translate(midX, midY);
        ctx.rotate(angleRad);

        const text = `${distance} m`;
        ctx.font = `bold ${12 / currentZoom}px Arial`;
        ctx.fillStyle = "white";
        ctx.fillRect(-ctx.measureText(text).width / 2 - 5, -20 / currentZoom, ctx.measureText(text).width + 10, 16 / currentZoom);

        ctx.fillStyle = "black";
        ctx.textAlign = "center";
        ctx.fillText(text, 0, -5 / currentZoom);

        ctx.restore();
    };

    const calculateAngleDeg = (p1, p2, p3) => {
        const v1x = p1.x - p2.x;
        const v1y = p1.y - p2.y;
        const v2x = p3.x - p2.x;
        const v2y = p3.y - p2.y;

        const angle1 = Math.atan2(v1y, v1x);
        const angle2 = Math.atan2(v2y, v2x);
        let angle = Math.abs(angle1 - angle2);
        if (angle > Math.PI) angle = 2 * Math.PI - angle;
        return (angle * 180) / Math.PI;
    };

    const drawAngleMarker = (ctx, p1, p2, p3) => {
        const angleDeg = calculateAngleDeg(p1, p2, p3);
        const angle1 = Math.atan2(p1.y - p2.y, p1.x - p2.x);
        const angle2 = Math.atan2(p3.y - p2.y, p3.x - p2.x);

        const radius = 30 / currentZoom;

        let startAngle = angle1;
        let endAngle = angle2;
        if (startAngle > endAngle) [startAngle, endAngle] = [endAngle, startAngle];
        if (Math.abs(angle2 - angle1) > Math.PI) [startAngle, endAngle] = [endAngle, startAngle];

        ctx.beginPath();
        ctx.strokeStyle = "red";
        ctx.lineWidth = 2 / currentZoom;
        ctx.arc(p2.x, p2.y, radius, startAngle, endAngle);
        ctx.stroke();

        ctx.fillStyle = "red";
        ctx.font = `bold ${14 / currentZoom}px Arial`;
        const textRadius = radius + 15 / currentZoom;
        const textAngle = (angle1 + angle2) / 2;
        const textX = p2.x + textRadius * Math.cos(textAngle);
        const textY = p2.y + textRadius * Math.sin(textAngle);

        ctx.textAlign = "center";
        ctx.fillText(`${angleDeg.toFixed(1)}°`, textX, textY);
    };
    // --- Tool Handlers ---

    const handleToolStart = (e) => {
        e.preventDefault();
        if (!overlayRef.current) return;
        
        // Handle multi-click tools first
        if (currentTool === 'angle') {
            const { x, y } = getCanvasCoords(e);
            const newPoint = { x, y };

            if (measurementPoints.length < 3) {
                setMeasurementPoints(prev => [...prev, newPoint]);
            }
            // Logic for angle completion is in handleToolEnd
            
            return;
        }

        // Standard tool start
        setIsDrawing(true);
        setStartX(e.clientX);
        setStartY(e.clientY);
        
        const { x, y } = getCanvasCoords(e);
        setLastX(x);
        setLastY(y);

        if (currentTool === 'measure' || currentTool === 'line' || currentTool === 'rect' || currentTool === 'pen' || currentTool === 'eraser') {
            const ctx = overlayRef.current.getContext('2d');
            ctx.strokeStyle = currentColor;
            ctx.lineWidth = currentStrokeWidth / currentZoom;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            
            if (currentTool === 'pen' || currentTool === 'eraser') {
                ctx.moveTo(x, y);
            }
        }
    };

    const handleToolMove = (e) => {
        if (!isDrawing) return;
        
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        const { x, y } = getCanvasCoords(e);

        if (currentTool === 'pan') {
            const wrapper = canvasWrapperRef.current;
            wrapper.scrollLeft -= dx;
            wrapper.scrollTop -= dy;
            setStartX(e.clientX); 
            setStartY(e.clientY);
            return;
        } 
        
        // For drawing/measurement tools, redraw the history first for ephemeral drawing
        redrawHistory(historyIndex); 

        const ctx = overlayRef.current.getContext('2d');
        ctx.strokeStyle = currentTool === 'eraser' ? 'rgba(233, 233, 233, 1)' : currentColor; // Use background color for eraser
        ctx.lineWidth = (currentTool === 'eraser' ? 20 : currentStrokeWidth) / currentZoom;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        if (currentTool === 'pen' || currentTool === 'eraser') {
            // Continuous drawing for pen/eraser
            ctx.beginPath();
            ctx.moveTo(lastX, lastY);
            ctx.lineTo(x, y);
            ctx.stroke();
            setLastX(x);
            setLastY(y);
        } else if (currentTool === 'line') {
            // Ephemeral line drawing (redraws a fresh line on the history)
            ctx.beginPath();
            ctx.moveTo(lastX, lastY);
            ctx.lineTo(x, y);
            ctx.stroke();
        } else if (currentTool === 'rect') {
            // Ephemeral rectangle drawing
            const width = x - lastX;
            const height = y - lastY;
            ctx.beginPath();
            ctx.strokeRect(lastX, lastY, width, height);
        } else if (currentTool === 'measure') {
            // Draw temporary dashed line
            ctx.strokeStyle = currentColor;
            ctx.lineWidth = 2 / currentZoom;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(lastX, lastY);
            ctx.lineTo(x, y);
            ctx.stroke();
            ctx.setLineDash([]); // Reset line dash

            const distance = calculateDistance({ x: lastX, y: lastY }, { x, y });
            drawMeasurementText(ctx, { x: lastX, y: lastY }, { x, y }, distance);
        }
    };

    const handleToolEnd = (e) => {
        if (!isDrawing && currentTool !== 'angle' && currentTool !== 'add-text') return;
        
        const { x, y } = getCanvasCoords(e);

        // --- Angle Tool (Multi-Click Logic) ---
        if (currentTool === 'angle' && measurementPoints.length > 0) {
            if (measurementPoints.length === 2) {
                // This is the 3rd click. Finalize.
                const ctx = overlayRef.current.getContext('2d');
                const p1 = measurementPoints[0]; // Leg start
                const p2 = measurementPoints[1]; // Vertex
                const p3 = {x, y}; // Final leg end

                // Redraw final lines
                redrawHistory(historyIndex); // Ensure clean slate from ephemeral
                ctx.strokeStyle = currentColor;
                ctx.lineWidth = 2 / currentZoom;
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.lineTo(p3.x, p3.y);
                ctx.stroke();
                
                // Draw final angle marker
                drawAngleMarker(ctx, p1, p2, p3);
                
                // Finalize and save
                setMeasurementPoints([]);
                saveHistory();
            } else {
                // 1st or 2nd click: Draw a temporary line to help positioning
                const ctx = overlayRef.current.getContext('2d');
                ctx.fillStyle = 'red';
                ctx.beginPath();
                ctx.arc(x, y, 5, 0, 2 * Math.PI);
                ctx.fill();

                if (measurementPoints.length === 1) {
                    // Draw the first leg of the angle to the vertex
                    const p1 = measurementPoints[0];
                    ctx.strokeStyle = 'red';
                    ctx.lineWidth = 2 / currentZoom;
                    ctx.beginPath();
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(x, y);
                    ctx.stroke();
                }
            }
            return; 
        }

        // --- Add Text Tool ---
        if (currentTool === 'add-text') {
            const textInput = prompt("Enter text annotation:");
            if (textInput) {
                const ctx = overlayRef.current.getContext('2d');
                ctx.fillStyle = currentColor;
                ctx.font = `bold ${20 / currentZoom}px Arial`;
                ctx.fillText(textInput, x, y);
                saveHistory();
            }
            setIsDrawing(false);
            setCurrentTool('pan'); // Switch back to pan after adding text
            return;
        }

        // Handle standard drawing/measurement tools
        if (isDrawing) {
            const ctx = overlayRef.current.getContext('2d');
            
            // Redraw final object based on ephemeral drawing in handleToolMove
            if (currentTool === 'line') {
                ctx.strokeStyle = currentColor;
                ctx.lineWidth = currentStrokeWidth / currentZoom;
                ctx.beginPath();
                ctx.moveTo(lastX, lastY);
                ctx.lineTo(x, y);
                ctx.stroke();
            } else if (currentTool === 'rect') {
                ctx.strokeStyle = currentColor;
                ctx.lineWidth = currentStrokeWidth / currentZoom;
                const width = x - lastX;
                const height = y - lastY;
                ctx.beginPath();
                ctx.strokeRect(lastX, lastY, width, height);
            } else if (currentTool === 'measure') {
                const start = { x: lastX, y: lastY };
                const end = { x, y };
                const distance = calculateDistance(start, end);

                // Redraw final dashed line
                ctx.strokeStyle = currentColor;
                ctx.lineWidth = 2 / currentZoom;
                ctx.beginPath();
                ctx.setLineDash([5, 5]);
                ctx.moveTo(start.x, start.y);
                ctx.lineTo(end.x, end.y);
                ctx.stroke();
                ctx.setLineDash([]); 

                // Draw final text
                drawMeasurementText(ctx, start, end, distance);
            } else if (currentTool === 'pen' || currentTool === 'eraser') {
                // Pen and Eraser are continuous, so the drawing is already complete.
            }
            
            setIsDrawing(false);
            saveHistory(); 
        }
    };
    
    // Function to delete all annotations (Fulfills the "remove text/drawing" request powerfully)
    const handleDeleteAll = () => {
        const confirmDelete = window.confirm("Are you sure you want to delete ALL annotations on this page? This action cannot be undone.");
        if (confirmDelete) {
            setHistoryStack([]);
            setHistoryIndex(-1);
            redrawHistory(-1); // Clear the canvas immediately
        }
    };

    // --- PDF & Zoom Controls ---
    
    const fileBaseName = filePath ? filePath.split("/").pop().split("\\").pop() : null;
    const fileUrl = fileBaseName ? `/api/projects/${projectId}/files/${fileBaseName}` : null;

    const renderPage = useCallback(async (page, zoom) => {
        const viewport = page.getViewport({ scale: 1 });
        
        const pdfCanvas = pdfCanvasRef.current;
        const overlay = overlayRef.current;
        
        pdfCanvas.height = viewport.height;
        pdfCanvas.width = viewport.width;
        overlay.height = viewport.height;
        overlay.width = viewport.width;
        
        pdfCanvas.style.transform = `scale(${zoom})`;
        overlay.style.transform = `scale(${zoom})`;
        
        page.render({
            canvasContext: pdfCanvas.getContext('2d'),
            viewport: viewport
        });

        if (overlay) redrawHistory(historyIndex);

    }, [historyIndex]);

    useEffect(() => {
        if (!fileUrl || !pdfCanvasRef.current) return;
        
        const loadingTask = pdfjsLib.getDocument(fileUrl);
        loadingTask.promise.then(
            (pdf) => {
                pdf.getPage(1).then((page) => {
                    renderPage(page, currentZoom);
                });
            },
            (reason) => {
                console.error("Error loading PDF:", reason);
            }
        );
    }, [fileUrl, renderPage, currentZoom]);
    
    const handleZoom = (factor) => {
        const newZoom = Math.min(3.0, Math.max(0.5, currentZoom + factor));
        setCurrentZoom(newZoom);
    };
    
    const handleFitToScreen = () => {
        if (!pdfCanvasRef.current || !canvasWrapperRef.current) return;
        const wrapperWidth = canvasWrapperRef.current.clientWidth - 40;
        const pdfWidth = pdfCanvasRef.current.width;
        const fitZoom = (wrapperWidth / pdfWidth) * 0.95; 
        setCurrentZoom(fitZoom);
    };

    // --- Save Function (Download & Upload) ---
    const handleSave = async () => {
        if (!pdfCanvasRef.current) return;

        // Temporarily reset zoom for accurate canvas capture
        const originalTransform = overlayRef.current.style.transform;
        overlayRef.current.style.transform = `scale(1)`;
        pdfCanvasRef.current.style.transform = `scale(1)`;
        
        // Use html2canvas to combine PDF and annotations into a single PNG image
        const canvas = await html2canvas(canvasWrapperRef.current, { 
            allowTaint: true, 
            useCORS: true,
            // Ignore UI elements during capture
            ignoreElements: (element) => element.classList.contains('editor-title') || element.classList.contains('editor-toolbar') 
        });
        
        // Restore original zoom
        overlayRef.current.style.transform = originalTransform;
        pdfCanvasRef.current.style.transform = originalTransform;

        const finalImageBase64 = canvas.toDataURL('image/png');
        
        // 1. Download the file locally
        const downloadFileName = fileName.replace(".pdf", "_annotated.png");
        const link = document.createElement('a');
        link.download = downloadFileName;
        link.href = finalImageBase64;
        document.body.appendChild(link);
        link.click(); 
        document.body.removeChild(link);
        
        // 2. Upload to Server
        try {
            const resp = await fetch(`/api/projects/${projectId}/save_annotated_pdf`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    filename: downloadFileName, 
                    pdfData: finalImageBase64 
                }),
            });
            const data = await resp.json();
            if (data.success) {
                alert("✅ Saved and Uploaded successfully!");
            } else {
                alert(`❌ Upload failed: ${data.message || 'Server error'}`);
            }
        } catch (e) {
            console.error("Server upload failed:", e);
            alert(`❌ Server upload failed: ${e.message}`);
        }
    };


    // --- Render ---

    let cursorStyle = 'crosshair';
    if (currentTool === 'pan') {
        cursorStyle = isDrawing ? 'grabbing' : 'grab';
    } else if (currentTool === 'eraser') {
        cursorStyle = 'cell';
    } else if (currentTool === 'add-text') {
        cursorStyle = 'text';
    } else if (currentTool === 'angle') {
         // 🚀 FIX 2: Correctly format the inline style string (no semicolon)
        cursorStyle = `url('/path/to/angle_icon_${measurementPoints.length + 1}.png'), crosshair`;
    }

    return (
        <div className="chatgpt-workspace-layout full-height-container">
            
            {/* Sidebar */}
            <aside className="project-history-panel chatgpt-history-card editor-sidebar">
                <header className="sidebar-header">
                    <button className="new-project-btn primary-btn" onClick={() => navigate("/annotation")}>
                        <i className="fas fa-chevron-left"></i> Back to Import
                    </button>
                    <h3 className="panel-subtitle">Annotation Settings</h3>
                </header>

                <div className="project-list-scroll full-height-scroll sidebar-controls">
                    
                    {/* Undo/Redo */}
                    <div className="setting-group history-group">
                        <h4><i className="fas fa-history"></i> History</h4>
                        <div className="toolbar-group">
                            <button className="tool-btn icon-btn sidebar-btn" onClick={handleUndo} disabled={historyIndex <= -1} title="Undo">
                                <i className="fas fa-undo"></i> Undo
                            </button>
                            <button className="tool-btn icon-btn sidebar-btn" onClick={handleRedo} disabled={historyIndex >= historyStack.length - 1} title="Redo">
                                <i className="fas fa-redo"></i> Redo
                            </button>
                        </div>
                    </div>
                    
                    {/* NEW BUTTON: Delete All Annotations */}
                    <div className="setting-group history-group">
                        <h4><i className="fas fa-trash-alt"></i> Clean Up</h4>
                        <button className="tool-btn icon-btn sidebar-btn delete-all-btn" onClick={handleDeleteAll} title="Delete all annotations">
                            <i className="fas fa-trash-alt"></i> Delete All
                        </button>
                    </div>

                    {/* Zoom Controls */}
                    <div className="setting-group zoom-group">
                        <h4><i className="fas fa-search-plus"></i> Zoom Control</h4>
                        <div className="toolbar-group zoom-controls">
                            <button className="tool-btn icon-btn sidebar-btn" onClick={() => handleZoom(0.1)} title="Zoom In">
                                <i className="fas fa-plus"></i>
                            </button>
                            <button className="tool-btn icon-btn sidebar-btn" onClick={() => handleZoom(-0.1)} title="Zoom Out">
                                <i className="fas fa-minus"></i>
                            </button>
                            <button className="tool-btn icon-btn sidebar-btn" onClick={handleFitToScreen} title="Fit to Screen">
                                <i className="fas fa-expand-arrows-alt"></i> Fit
                            </button>
                            <span className="zoom-display">{Math.round(currentZoom * 100)}%</span>
                        </div>
                    </div>

                    {/* Scale Control */}
                    <div className="setting-group scale-group">
                        <h4><i className="fas fa-ruler-combined"></i> Scale</h4>
                        <label className="scale-control">Scale (m/px): 
                            <input
                                type="number"
                                value={scaleRatio}
                                step="0.01"
                                onChange={(e) => setScaleRatio(parseFloat(e.target.value) || 0.05)}
                            />
                        </label>
                    </div>

                </div>
            </aside>

            {/* Main Editor Content */}
            <div className="single-workspace-tile chatgpt-main-box full-height-panel editor-main-panel">
                <div className="annotation-container large-chat-container">
                    <h2 className="editor-title">📄 Annotation PDF Editor — <span id="currentFilename">{fileName}</span></h2>

                    {/* Main Toolbar (Tool Selection) */}
                    <div className="editor-toolbar">
                        
                        <div className="toolbar-group annotation-tools">
                            {/* Panning Tool */}
                            <button onClick={() => setCurrentTool("pan")} className={currentTool === 'pan' ? 'tool-btn active' : 'tool-btn'} title="Pan / Move PDF">
                                <i className="fas fa-arrows-alt"></i>
                            </button>
                            {/* Drawing Tools */}
                            <button onClick={() => setCurrentTool("pen")} className={currentTool === 'pen' ? 'tool-btn active' : 'tool-btn'} title="Freehand Pen">
                                <i className="fas fa-pencil-alt"></i>
                            </button>
                            {/* NEW: Straight Line Tool */}
                            <button onClick={() => setCurrentTool("line")} className={currentTool === 'line' ? 'tool-btn active' : 'tool-btn'} title="Draw Straight Line">
                                <i className="fas fa-minus"></i>
                            </button>
                            {/* Rectangle */}
                            <button onClick={() => setCurrentTool("rect")} className={currentTool === 'rect' ? 'tool-btn active' : 'tool-btn'} title="Draw Rectangle">
                                <i className="far fa-square"></i>
                            </button>

                            {/* NEW: Linear Measurement Tool */}
                            <button onClick={() => setCurrentTool("measure")} className={currentTool === 'measure' ? 'tool-btn active' : 'tool-btn'} title="Linear Measurement (Distance)">
                                <i className="fas fa-ruler-horizontal"></i>
                            </button>
                            
                            {/* NEW: Angle Measurement Tool */}
                            <button onClick={() => setCurrentTool("angle")} className={currentTool === 'angle' ? 'tool-btn active' : 'tool-btn'} title="Angle Measurement (3-Point)">
                                <i className="fas fa-angle-left"></i>
                            </button>

                            {/* NEW: Text Tool (Add Text) */}
                            <button onClick={() => setCurrentTool("add-text")} className={currentTool === 'add-text' ? 'tool-btn active' : 'tool-btn'} title="Add Text Annotation">
                                <i className="fas fa-font"></i>
                            </button>

                            {/* Eraser Tool (Remove Drawing) */}
                            <button onClick={() => setCurrentTool("eraser")} className={currentTool === 'eraser' ? 'tool-btn active' : 'tool-btn'} title="Freehand Eraser (Removes drawing ink)">
                                <i className="fas fa-eraser"></i>
                            </button>
                        </div>
                        
                        {/* Color and Width Controls */}
                        <div className="toolbar-group style-controls">
                            <label className="color-label" title="Line Color">
                                <input 
                                    type="color" 
                                    value={currentColor} 
                                    onChange={(e) => setCurrentColor(e.target.value)} 
                                />
                            </label>
                            
                            <label className="width-label">
                                <i className="fas fa-grip-lines"></i>
                                <input
                                    type="number"
                                    value={currentStrokeWidth}
                                    step="1"
                                    min="1"
                                    onChange={(e) => setCurrentStrokeWidth(parseInt(e.target.value) || 4)}
                                    title="Line Width"
                                />
                            </label>
                        </div>

                        <button className="tool-btn save-btn primary-btn-3d" onClick={handleSave} title="Save Edited File">
                            <i className="fas fa-cloud-upload-alt"></i> Save & Upload
                        </button>

                    </div>
                    {/* END TOOLBAR */}

                    {/* Canvas Area for PDF and Annotations */}
                    <div 
                        ref={canvasWrapperRef}
                        className="canvas-wrapper"
                    >
                        <canvas id="pdfCanvas" ref={pdfCanvasRef}></canvas>
                        <canvas 
                            id="overlay" 
                            ref={overlayRef}
                            onMouseDown={handleToolStart}
                            onMouseMove={handleToolMove}
                            onMouseUp={handleToolEnd}
                            onMouseLeave={handleToolEnd}
                            style={{ cursor: cursorStyle }}
                        ></canvas>
                        {!filePath && <p className="placeholder-text">Please select a file to start editing...</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnnotationEditor;