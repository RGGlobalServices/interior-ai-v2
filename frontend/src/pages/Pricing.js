import React, { useState, useEffect, useRef } from 'react';

function Pricing() {
  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState([]);
  const chatBoxRef = useRef(null);
  
  // --- API/Logic Functions (Simplified for structure review) ---
  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      const data = await response.json();
      setProjects(data);
      if (data.length > 0 && !currentProject) {
        // Set the most recent project as the current one
        setCurrentProject(data[0]);
      }
    } catch (error) {
      // Keep this for debugging API issues
      console.error('Error fetching projects:', error); 
    }
  };

  const createNewProject = async () => {
    const projectName = prompt("Enter new project name:");
    if (!projectName) return;
    // ... API call to POST /api/projects ...
    fetchProjects(); 
  };
  
  const sendMessage = async () => {
    if (!chatInput.trim() || !currentProject) return;
    // ... API call to POST /api/projects/<pid>/discuss ...
    setChatInput('');
  };
  
  // --- Hooks ---
  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [messages]);


  return (
    <>
      {/* 1. Project History Panel (Left Sidebar) */}
      <aside className="project-history-panel chatgpt-history-card full-height-panel">
        <header className="project-header">
          <button id="newProjectBtn" className="new-project-btn primary-btn-3d" onClick={createNewProject}>
            <i className="icon-plus-3d"></i> New Project
          </button>
        </header>
        
        <div className="project-list-scroll full-height-scroll" id="clientFolders">
          {projects.map(p => (
            <div 
              key={p.id} 
              className={`project-item ${currentProject && currentProject.id === p.id ? 'active' : ''}`}
              onClick={() => setCurrentProject(p)}
            >
              {p.name}
            </div>
          ))}
        </div>
      </aside>

      {/* 2. Main Chat Workspace (Right Panel) */}
      <div className="single-workspace-tile chatgpt-main-box full-height-panel">
        <div className="ai-chat-tile large-chat-container">
          
          <div ref={chatBoxRef} id="chatMessages" className="chat-messages whatsapp-style-3d-box dynamic-message-area">
            {messages.length === 0 && (
                <div className="msg ai initial-greeting">Ready when you are. Select a project to start.</div>
            )}
            {/* Render chat messages */}
            {messages.map((msg, index) => (
              <div key={index} className={`msg ${msg.role}`}>
                {msg.content}
              </div>
            ))}
          </div>
          
          <div className="chat-input-area centered-input-bar fixed-input-height">
            {/* Hidden File Upload (Only for the chat interface) */}
            <input type="file" id="fileUpload" multiple style={{ display: 'none' }} />
            <button className="upload-icon-btn" title="Upload Files (Plans/Images)">
              <i className="fas fa-paperclip"></i>
            </button>
            
            <input 
              type="text" 
              id="chatInput" 
              placeholder={currentProject ? "Ask your AI interior designer something..." : "Select or create a project first..."}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              disabled={!currentProject}
            />
            
            <button id="sendMsg" className="send-btn" onClick={sendMessage} disabled={!chatInput.trim() || !currentProject}>
              Send
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default Pricing;