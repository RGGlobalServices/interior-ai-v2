import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

function AnnotationImport() {
  const [selectedFile, setSelectedFile] = useState(null);
  const pdfUploadRef = useRef(null);
  const navigate = useNavigate();

  const handleAddPdfClick = () => {
    pdfUploadRef.current.click();
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    setSelectedFile(file);
  };

  const handleOpenEditorClick = async () => {
    if (!selectedFile) return;

    const formData = new FormData();
    const currentProjectId = 'default_project_1';
    formData.append('file', selectedFile);

    try {
      const response = await fetch(`/api/projects/${currentProjectId}/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      console.log('Upload response:', data);  // Debug log

      if (response.ok && data.success) {
        navigate('/annotation_editor', { 
          state: { 
            filePath: data.path,
            fileName: selectedFile.name,
            projectId: currentProjectId
          } 
        });
      } else {
        alert(`Upload failed: ${data.error || 'Server error'}`);
      }
    } catch (error) {
      console.error('Upload failed:', error);
      alert('A network error occurred during upload.');
    }
  };

  const uploadIconClass = selectedFile ? 'fas fa-check-circle' : 'fas fa-file-upload';
  const buttonText = selectedFile ? `Selected: ${selectedFile.name}` : 'Add PDF File';

  return (
    <div className="single-workspace-tile chatgpt-main-box full-height-panel discussion-mode">
      <div id="annotationMain" className="annotation-container large-chat-container">
        <div id="importView" className="view-content active" style={{ textAlign: 'center' }}>
          <h2 className="import-title">Import Designs</h2>
          
          <input 
            type="file" 
            id="pdfUpload" 
            accept="application/pdf,image/*" 
            style={{ display: 'none' }} 
            ref={pdfUploadRef} 
            onChange={handleFileChange}
          />

          <div className="add-file-box-3d">
            <button 
              id="addPdfFileBtn" 
              className="add-file-icon-btn primary-btn-3d"
              onClick={handleAddPdfClick}
            >
              <i className={uploadIconClass} style={{ fontSize: '3rem' }}></i>
              <span>{buttonText}</span>
            </button>
          </div>
          
          <button 
            id="openEditorBtn" 
            className="primary-btn-3d edit-btn-3d" 
            onClick={handleOpenEditorClick}
            disabled={!selectedFile}
          >
            <i className="fas fa-magic"></i> Send & Open 3D Editor
          </button>
        </div>
      </div>
    </div>
  );
}

export default AnnotationImport;