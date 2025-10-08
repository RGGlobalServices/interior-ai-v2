import React, { useState, useEffect, useRef } from 'react';

// NOTE: Uses the same API endpoint as Pricing, but designed for general discussion.
const GLOBAL_DISCUSSION_PID = 'global_discussion'; // Assuming you filter this ID on Flask side or use PID 

function Discussion() {
    const [discussionInput, setDiscussionInput] = useState('');
    const [messages, setMessages] = useState([{ role: 'ai', content: 'Welcome to the global design discussion! I can offer style advice, material suggestions, or analyze design trends.' }]);
    const chatBoxRef = useRef(null);

    const sendDiscussionMessage = async () => {
        if (!discussionInput.trim()) return;

        const userMessage = { role: 'user', content: discussionInput.trim() };
        const tempAiMessage = { role: 'ai', content: '...', temp: true };

        setMessages(prev => [...prev, userMessage, tempAiMessage]);
        setDiscussionInput('');

        try {
            const response = await fetch(`/api/projects/${GLOBAL_DISCUSSION_PID}/discuss`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userMessage.content }),
            });
            const data = await response.json();
            
            setMessages(prev => {
                const newMessages = prev.filter(msg => !msg.temp);
                newMessages.push({ role: 'ai', content: data.assistant });
                return newMessages;
            });

        } catch (error) {
            console.error('Error in global discussion:', error);
        }
    };

    useEffect(() => {
        // Scroll to bottom when messages update
        if (chatBoxRef.current) {
            chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
        }
    }, [messages]);

    return (
        <div className="single-workspace-tile chatgpt-main-box full-height-panel">
            <div className="page-title">
                <h1>💬 Global AI Discussion Board</h1>
                <p>Ask the AI general design questions or start a new conceptual chat outside of a specific project.</p>
            </div>
            
            <div className="ai-chat-tile large-chat-container">
                <div ref={chatBoxRef} id="discussionMessages" className="chat-messages whatsapp-style-3d-box dynamic-message-area">
                    {messages.map((msg, index) => (
                        <div key={index} className={`msg ${msg.role}`}>
                            {msg.content}
                        </div>
                    ))}
                </div>

                <div className="chat-input-area centered-input-bar fixed-input-height">
                    <input 
                        type="text" 
                        id="discussionInput" 
                        placeholder="Start a conversation..." 
                        value={discussionInput}
                        onChange={(e) => setDiscussionInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && sendDiscussionMessage()}
                    />
                    <button id="sendDiscussion" className="send-btn" onClick={sendDiscussionMessage} disabled={!discussionInput.trim()}>
                        Send
                    </button>
                </div>
            </div>
        </div>
    );
}

export default Discussion;