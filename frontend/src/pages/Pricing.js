import React, { useState, useEffect, useRef } from 'react';

function Pricing() {
  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState([]);
  const chatBoxRef = useRef(null);

  // --- API / Data Fetching Functions ---
  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      const data = await response.json();
      setProjects(data);

      if (data.length > 0 && !currentProject) {
        setCurrentProject(data[0]); // default to the first project
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const createNewProject = async () => {
    const projectName = prompt('Enter new project name:');
    if (!projectName) return;

    try {
      // Example POST API call
      await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: projectName }),
      });
      fetchProjects();
    } catch (error) {
      console.error('Error creating project:', error);
    }
  };

  const sendMessage = async () => {
    if (!chatInput.trim() || !currentProject) return;

    try {
      // Example POST API call to save chat message
      await fetch(`/api/projects/${currentProject.id}/discuss`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: chatInput }),
      });

      // Append message locally
      setMessages(prev => [...prev, { role: 'user', content: chatInput }]);
      setChatInput('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
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
      {/* --- Sidebar: Project History Panel --- */}
      <aside className="project-history-panel chatgpt-history-card full-height-panel">
        <header className="project-header">
          <button 
            className="new-project-btn primary-btn-3d" 
            onClick={createNewProject}
          >
            <i className="icon-plus-3d"></i> New Project
          </button>
        </header>

        <div className="project-list-scroll full-height-scroll" id="clientFolders">
          {projects.map(p => (
            <div
              key={p.id}
              className={`project-item ${currentProject?.id === p.id ? 'active' : ''}`}
              onClick={() => setCurrentProject(p)}
            >
              {p.name}
            </div>
          ))}
        </div>
      </aside>

      {/* --- Main Chat Workspace --- */}
      <div className="single-workspace-tile chatgpt-main-box full-height-panel">
        <div className="ai-chat-tile large-chat-container">
          
          <div 
            ref={chatBoxRef} 
            id="chatMessages" 
            className="chat-messages whatsapp-style-3d-box dynamic-message-area"
          >
            {messages.length === 0 && (
              <div className="msg ai initial-greeting">
                Ready when you are. Select a project to start.
              </div>
            )}
            {messages.map((msg, index) => (
              <div key={index} className={`msg ${msg.role}`}>
                {msg.content}
              </div>
            ))}
          </div>

          <div className="chat-input-area centered-input-bar fixed-input-height">
            <input type="file" id="fileUpload" multiple style={{ display: 'none' }} />
            <button className="upload-icon-btn" title="Upload Files">
              <i className="fas fa-paperclip"></i>
            </button>

            <input
              type="text"
              id="chatInput"
              placeholder={currentProject ? "Ask your AI interior designer..." : "Select or create a project first..."}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              disabled={!currentProject}
            />

            <button
              id="sendMsg"
              className="send-btn"
              onClick={sendMessage}
              disabled={!chatInput.trim() || !currentProject}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default Pricing;
