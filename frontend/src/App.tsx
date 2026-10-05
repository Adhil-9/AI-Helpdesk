import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import axios from 'axios';
import { ArrowUp, UserCircle, Mic, MicOff, MessageSquarePlus, MessageSquare, Copy, Check, Trash2, LogOut, Sun, Moon, PanelLeftClose, PanelLeft, Edit3, Plus, X } from 'lucide-react';
import './App.css';
import Auth from './Auth';
import AILogo from './AILogo';

interface Source {
  document: string;
  pageNumber: number | null;
}

interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  sources?: Source[];
  imageUrl?: string;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
  createdAt: number;
}

type Theme = 'light' | 'dark';

function App() {
  const [theme, setTheme] = useState<Theme>('light');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userEmail, setUserEmail] = useState<string>('');
  
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Edit Message State
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editInputValue, setEditInputValue] = useState<string>('');

  // Attachment State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedImage(file);
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
      setImagePreviewUrl(URL.createObjectURL(file));
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Sidebar Resize & Collapse State
  const [sidebarWidth, setSidebarWidth] = useState<number>(240);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarWidthRef = useRef(sidebarWidth);

  // Sync ref
  useEffect(() => {
    sidebarWidthRef.current = sidebarWidth;
  }, [sidebarWidth]);

  // Load saved sidebar state
  useEffect(() => {
    const savedWidth = localStorage.getItem('ai_helpdesk_sidebar_width');
    if (savedWidth) {
      const width = parseInt(savedWidth, 10);
      if (width >= 200 && width <= 380) setSidebarWidth(width);
    }
    const savedCollapsed = localStorage.getItem('ai_helpdesk_sidebar_collapsed');
    if (savedCollapsed === 'true') setIsSidebarCollapsed(true);
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsResizing(true);
    e.preventDefault();
  };

  useEffect(() => {
    if (!isResizing) return;

    const handlePointerMove = (e: PointerEvent) => {
      let newWidth = e.clientX;
      if (newWidth < 200) newWidth = 200;
      if (newWidth > 380) newWidth = 380;
      setSidebarWidth(newWidth);
    };

    const handlePointerUp = () => {
      setIsResizing(false);
      localStorage.setItem('ai_helpdesk_sidebar_width', sidebarWidthRef.current.toString());
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    return () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isResizing]);

  const toggleSidebarCollapse = () => {
    const newCollapsed = !isSidebarCollapsed;
    setIsSidebarCollapsed(newCollapsed);
    localStorage.setItem('ai_helpdesk_sidebar_collapsed', newCollapsed.toString());
  };

  // Profile Menu State
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsProfileMenuOpen(false);
      }
    };

    if (isProfileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isProfileMenuOpen]);

  const getInitials = (email: string) => {
    if (!email) return 'U';
    const parts = email.split('@')[0].split(/[._-]/);
    if (parts.length > 1) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const generateId = () => Math.random().toString(36).substring(2, 11);

  // Initialize Theme
  useLayoutEffect(() => {
    const savedTheme = localStorage.getItem('ai_helpdesk_theme') as Theme | null;
    if (savedTheme === 'dark' || savedTheme === 'light') {
      setTheme(savedTheme);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
    }
  }, []);

  useLayoutEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ai_helpdesk_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Initialize auth state
  useEffect(() => {
    const token = localStorage.getItem('ai_help_desk_token');
    const email = localStorage.getItem('ai_help_desk_user');
    if (token && email) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUserEmail(email);
      setIsAuthenticated(true);
    } else {
      setIsLoaded(true);
    }
  }, []);

  // Load sessions from local storage when authenticated
  useEffect(() => {
    if (isAuthenticated && userEmail) {
      const storageKey = `ai_help_desk_conversations_${userEmail}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setSessions(parsed);
        } catch (e) {
          console.error("Failed to load chat history", e);
        }
      } else {
        setSessions([]);
        setMessages([]);
        setActiveSessionId(null);
      }
      setIsLoaded(true);
    }
  }, [isAuthenticated, userEmail]);

  // Save sessions to local storage whenever they change
  useEffect(() => {
    if (isLoaded && isAuthenticated && userEmail) {
      const storageKey = `ai_help_desk_conversations_${userEmail}`;
      localStorage.setItem(storageKey, JSON.stringify(sessions));
    }
  }, [sessions, isLoaded, isAuthenticated, userEmail]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Voice Input State
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-IN';

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setInput(prev => {
            const space = prev && !prev.endsWith(' ') ? ' ' : '';
            return prev + space + finalTranscript.trim();
          });
          
          if (recognitionRef.current) {
            recognitionRef.current.stop();
          }
          setIsListening(false);
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'not-allowed') {
          setSpeechError('Microphone permission is required.');
        } else {
          setSpeechError(`Voice input error: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      setSpeechError("Voice input isn't supported in this browser.");
      setTimeout(() => setSpeechError(null), 3000);
      return;
    }
    
    setSpeechError(null);
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error("Speech recognition error:", err);
      }
    }
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLoginSuccess = (email: string, token: string) => {
    localStorage.setItem('ai_help_desk_token', token);
    localStorage.setItem('ai_help_desk_user', email);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUserEmail(email);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('ai_help_desk_token');
    localStorage.removeItem('ai_help_desk_refresh');
    localStorage.removeItem('ai_help_desk_user');
    delete axios.defaults.headers.common['Authorization'];
    setIsAuthenticated(false);
    setUserEmail('');
    setSessions([]);
    setMessages([]);
    setActiveSessionId(null);
  };

  const handleSend = async (textToSend: string = input) => {
    if (!textToSend.trim() && !selectedImage) return;

    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);

    let currentSessionId = activeSessionId;
    let isNewSession = false;

    if (!currentSessionId) {
      currentSessionId = generateId();
      setActiveSessionId(currentSessionId);
      isNewSession = true;
    }

    const currentImage = selectedImage;
    let historyImageUrl = undefined;
    
    if (currentImage) {
      try {
        const getBase64 = (file: File) => new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        historyImageUrl = await getBase64(currentImage);
      } catch (e) {
        // fallback to object url, will break on refresh
        historyImageUrl = imagePreviewUrl || undefined;
      }
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend,
      imageUrl: historyImageUrl
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    clearImage();

    const isNewSessionLocal = isNewSession;

    setSessions(prev => {
      if (isNewSessionLocal) {
        let title = textToSend || "Image Upload";
        if (title.length > 40) {
          title = title.substring(0, 40) + '...';
        }
        const newSession: ChatSession = {
          id: currentSessionId as string,
          title,
          messages: newMessages,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        return [newSession, ...prev];
      } else {
        return prev.map(s => 
          s.id === currentSessionId 
            ? { ...s, messages: newMessages, updatedAt: Date.now() }
            : s
        );
      }
    });

    try {
      let response;
      if (currentImage) {
        const formData = new FormData();
        formData.append('question', userMessage.content);
        formData.append('conversationId', currentSessionId as string);
        formData.append('image', currentImage);
        
        response = await axios.post('/api/chat', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        response = await axios.post('/api/chat', {
          question: userMessage.content,
          conversationId: currentSessionId
        });
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: response.data.answer,
        sources: response.data.sources
      };

      const finalMessages = [...newMessages, aiMessage];
      setMessages(finalMessages);
      
      setSessions(prev => prev.map(s => 
        s.id === currentSessionId 
          ? { ...s, messages: finalMessages, updatedAt: Date.now() }
          : s
      ));

    } catch (error: any) {
      console.error('Error fetching chat response:', error);
      
      // Auto logout on 401 Unauthorized
      if (error?.response?.status === 401) {
        handleLogout();
        return;
      }

      const serverMessage = error?.response?.data?.error || error?.response?.data?.answer;
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: serverMessage || 'Sorry, I encountered an error while processing your request. Please ensure the backend is running.',
      };
      
      const errorMessages = [...newMessages, errorMessage];
      setMessages(errorMessages);
      
      setSessions(prev => prev.map(s => 
        s.id === currentSessionId 
          ? { ...s, messages: errorMessages, updatedAt: Date.now() }
          : s
      ));

    } finally {
      setIsLoading(false);
    }
  };

  const handleEditSubmit = async (msgId: string, newText: string) => {
    if (!newText.trim() || !activeSessionId) {
      setEditingMessageId(null);
      return;
    }

    const msgIndex = messages.findIndex(m => m.id === msgId);
    if (msgIndex === -1) {
      setEditingMessageId(null);
      return;
    }

    // Keep messages before the edited one
    const previousMessages = messages.slice(0, msgIndex);
    const originalMessage = messages[msgIndex];
    
    // The edited message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: newText,
      imageUrl: originalMessage.imageUrl
    };

    const newMessages = [...previousMessages, userMessage];
    setMessages(newMessages);
    setIsLoading(true);
    setEditingMessageId(null);
    setEditInputValue('');

    const currentSessionId = activeSessionId;

    setSessions(prev => prev.map(s => 
      s.id === currentSessionId 
        ? { ...s, messages: newMessages, updatedAt: Date.now() }
        : s
    ));

    try {
      const response = await axios.post('/api/chat', {
        question: userMessage.content,
        conversationId: currentSessionId
      });

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: response.data.answer,
        sources: response.data.sources
      };

      const finalMessages = [...newMessages, aiMessage];
      setMessages(finalMessages);
      
      setSessions(prev => prev.map(s => 
        s.id === currentSessionId 
          ? { ...s, messages: finalMessages, updatedAt: Date.now() }
          : s
      ));

    } catch (error: any) {
      console.error('Error fetching chat response for edit:', error);
      
      if (error?.response?.status === 401) {
        handleLogout();
        return;
      }

      const serverMessage = error?.response?.data?.answer;
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: serverMessage || 'Sorry, I encountered an error while processing your request.',
      };
      
      const errorMessages = [...newMessages, errorMessage];
      setMessages(errorMessages);
      
      setSessions(prev => prev.map(s => 
        s.id === currentSessionId 
          ? { ...s, messages: errorMessages, updatedAt: Date.now() }
          : s
      ));

    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setActiveSessionId(null);
    setDeleteConfirmId(null);
  };

  const handleLoadSession = (session: ChatSession) => {
    setMessages(session.messages);
    setActiveSessionId(session.id);
    setDeleteConfirmId(null);
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirmId(id);
  };

  const confirmDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessions(prev => prev.filter(s => s.id !== id));
    if (activeSessionId === id) {
      handleNewChat();
    }
    setDeleteConfirmId(null);
  };

  const cancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirmId(null);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const suggestions = [
    { title: 'Academics', desc: 'Programs, departments & syllabus', query: 'What academic programs and departments are available?' },
    { title: 'Admissions', desc: 'Eligibility & admission information', query: 'What is the admission and eligibility criteria?' },
    { title: 'Examinations', desc: 'Schedules & examination information', query: 'How does the examination and attendance system work?' },
    { title: 'Placements', desc: 'Training & placement information', query: 'What placement and training opportunities are provided?' },
    { title: 'Campus', desc: 'Facilities & student services', query: 'What facilities and campus services are available?' }
  ];

  if (!isLoaded) {
    return <div className="app-container" style={{ alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Auth onLoginSuccess={handleLoginSuccess} theme={theme} toggleTheme={toggleTheme} />;
  }

  return (
    <div className="app-container" style={{ '--sidebar-width': isSidebarCollapsed ? '68px' : `${sidebarWidth}px` } as React.CSSProperties}>
      {/* Sidebar */}
      <div className={`sidebar ${isSidebarOpen ? 'open' : 'closed'} ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <AILogo size={24} className="sidebar-logo" />
          {!isSidebarCollapsed && <h2>AI Help Desk</h2>}
          <button className="sidebar-collapse-btn" onClick={toggleSidebarCollapse} title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}>
            {isSidebarCollapsed ? <PanelLeft size={20} /> : <PanelLeftClose size={20} />}
          </button>
        </div>
        
        <button className="new-chat-btn" onClick={handleNewChat} title={isSidebarCollapsed ? "New Chat" : undefined}>
          <MessageSquarePlus size={18} />
          {!isSidebarCollapsed && <span>New Chat</span>}
        </button>

        <div className="sidebar-section">
          {!isSidebarCollapsed && <h3>Recent Chats</h3>}
          {isSidebarCollapsed && <div className="sidebar-section-divider"></div>}
          <div className="recent-chat-list">
            {[...sessions].sort((a, b) => b.updatedAt - a.updatedAt).map(session => (
              <div key={session.id} className="recent-chat-item-wrapper">
                <button 
                  className={`recent-chat-item ${activeSessionId === session.id ? 'active' : ''}`}
                  onClick={() => handleLoadSession(session)}
                  title={isSidebarCollapsed ? session.title : undefined}
                >
                  <MessageSquare size={16} />
                  {!isSidebarCollapsed && <span className="chat-title-text">{session.title}</span>}
                </button>
                
                {!isSidebarCollapsed && deleteConfirmId === session.id ? (
                  <div className="delete-confirm-popover" onClick={(e) => e.stopPropagation()}>
                    <span className="delete-confirm-text">Delete?</span>
                    <div className="delete-confirm-actions">
                      <button className="delete-confirm-btn yes" onClick={(e) => confirmDelete(session.id, e)}>Yes</button>
                      <button className="delete-confirm-btn no" onClick={cancelDelete}>No</button>
                    </div>
                  </div>
                ) : (
                  !isSidebarCollapsed && (
                    <button 
                      className="delete-chat-btn" 
                      title="Delete Chat"
                      onClick={(e) => handleDeleteSession(session.id, e)}
                    >
                      <Trash2 size={14} />
                    </button>
                  )
                )}
              </div>
            ))}
            
            {!isSidebarCollapsed && sessions.length === 0 && (
              <div className="empty-chats-message">
                No recent chats
              </div>
            )}
          </div>
        </div>

        <div className="sidebar-footer">
          <div className="user-info-wrapper" title={isSidebarCollapsed ? userEmail : undefined}>
            <div className="avatar-initials small">{getInitials(userEmail)}</div>
            {!isSidebarCollapsed && (
              <div className="sidebar-user-details">
                <span className="user-email-text">{userEmail}</span>
                <span className="user-status-text">Signed in</span>
              </div>
            )}
          </div>
          <button className="sidebar-footer-btn" onClick={handleLogout} title={isSidebarCollapsed ? "Logout" : undefined}>
            <LogOut size={18} />
            {!isSidebarCollapsed && <span>Logout</span>}
          </button>
        </div>
        
        {/* Resize Handle */}
        {!isSidebarCollapsed && (
          <div 
            className="sidebar-resize-handle" 
            onPointerDown={handlePointerDown}
          />
        )}
      </div>

      {/* Main Content */}
      <div className="main-content">
        <header className="top-header">
          <div className="top-header-left">
            <button className="menu-btn" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
              <AILogo size={24} color="var(--text-main)" />
            </button>
            <h2 className="top-header-title">AI Help Desk</h2>
          </div>
          <div className="top-header-right">
            <div className="theme-switch" onClick={toggleTheme} title="Toggle Theme" role="button" tabIndex={0} onKeyDown={(e) => { if(e.key === 'Enter') toggleTheme(); }}>
              <div className={`theme-switch-icon ${theme === 'light' ? 'active' : ''}`}>
                <Sun size={14} />
              </div>
              <div className={`theme-switch-icon ${theme === 'dark' ? 'active' : ''}`}>
                <Moon size={14} />
              </div>
            </div>
            <div className="header-user-wrapper" ref={profileMenuRef}>
              <div 
                className="header-user" 
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                title={userEmail}
                role="button"
                tabIndex={0}
              >
                <div className="avatar-initials small">{getInitials(userEmail)}</div>
              </div>
              
              {isProfileMenuOpen && (
                <div className="profile-popover">
                  <div className="profile-popover-header">
                    <div className="avatar-initials large">{getInitials(userEmail)}</div>
                    <div className="profile-popover-details">
                      <div className="profile-email">{userEmail}</div>
                      <div className="profile-status">Signed in</div>
                    </div>
                  </div>
                  <div className="profile-popover-divider"></div>
                  <button className="profile-logout-btn" onClick={() => {
                    setIsProfileMenuOpen(false);
                    handleLogout();
                  }}>
                    <LogOut size={16} />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="chat-area">
          {messages.length === 0 ? (
            <div className="welcome-screen">
              <div className="welcome-header">
                <div className="welcome-icon">
                  <AILogo size={28} color="var(--primary)" />
                </div>
                <h1>AI Help Desk</h1>
                <p>Your intelligent college knowledge assistant</p>
                <h2>Ask about academics, admissions, examinations, placements, campus facilities, and more.</h2>
              </div>
              
              <div className="suggestions-grid">
                {suggestions.map((suggestion, index) => (
                  <button 
                    key={index} 
                    className="suggestion-card"
                    onClick={() => handleSend(suggestion.query)}
                  >
                    <h3>{suggestion.title}</h3>
                    <p>{suggestion.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="chat-messages">
              {messages.map((msg) => (
                <div key={msg.id} className={`message-row ${msg.role}`}>
                  <div className="avatar">
                    {msg.role === 'user' ? <UserCircle size={20} /> : <AILogo size={20} />}
                  </div>
                  <div className="message-content-wrapper">
                    {msg.role === 'user' && editingMessageId === msg.id ? (
                      <div className="message-edit-container">
                        <textarea
                          className="message-edit-textarea"
                          value={editInputValue}
                          onChange={(e) => setEditInputValue(e.target.value)}
                          rows={Math.max(1, editInputValue.split('\n').length)}
                        />
                        <div className="message-edit-actions">
                          <button className="message-edit-btn cancel" onClick={() => setEditingMessageId(null)}>Cancel</button>
                          <button className="message-edit-btn save" onClick={() => handleEditSubmit(msg.id, editInputValue)}>Send</button>
                        </div>
                      </div>
                    ) : (
                      <div className="message-bubble">
                        {msg.imageUrl && (
                          <img src={msg.imageUrl} alt="Attached" className="message-attached-image" />
                        )}
                        <div className="message-text">{msg.content}</div>
                        
                        {msg.role === 'ai' && (
                          <button 
                            className="copy-btn" 
                            onClick={() => handleCopy(msg.content, msg.id)}
                            title="Copy to clipboard"
                          >
                            {copiedId === msg.id ? <Check size={14} color="var(--success)" /> : <Copy size={14} />}
                          </button>
                        )}
                        
                        {msg.role === 'user' && (
                          <button 
                            className="edit-btn" 
                            onClick={() => {
                              setEditingMessageId(msg.id);
                              setEditInputValue(msg.content);
                            }}
                            title="Edit message"
                          >
                            <Edit3 size={14} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="message-row ai">
                  <div className="avatar">
                    <AILogo size={20} />
                  </div>
                  <div className="message-content-wrapper">
                    <div className="message-bubble loading">
                      <div className="typing-indicator">
                        <div className="dot"></div>
                        <div className="dot"></div>
                        <div className="dot"></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="chat-input-container">
          <input 
            type="file" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            accept="image/png,image/jpeg,image/webp"
            onChange={handleImageSelect}
          />
          <div className={`input-wrapper ${isListening ? 'listening' : ''}`}>
            {imagePreviewUrl && (
              <div className="image-preview-container">
                <img src={imagePreviewUrl} alt="Selected" className="image-preview" />
                <button className="remove-image-btn" onClick={clearImage} title="Remove image">
                  <X size={14} />
                </button>
              </div>
            )}
            <div className="input-row">
              <button 
                className="attach-btn" 
                title="Add attachment"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
            >
              <Plus size={20} />
            </button>
            <input
              type="text"
              className="chat-input"
              placeholder={isListening ? "Listening..." : "Ask anything about the college..."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
            />
            <button
              className={`mic-button ${isListening ? 'recording' : ''}`}
              onClick={toggleListening}
              title={isListening ? "Stop voice input" : "Start voice input"}
              aria-label={isListening ? "Stop voice input" : "Start voice input"}
              disabled={isLoading}
            >
              {isListening ? <MicOff size={18} /> : <Mic size={18} />}
              {isListening && <span className="mic-pulse"></span>}
            </button>
            <button 
              className="send-button" 
              onClick={() => handleSend()}
              disabled={(!input.trim() && !selectedImage) || isLoading}
            >
              <ArrowUp size={18} />
            </button>
            </div>
          </div>
          {speechError && <div className="speech-error">{speechError}</div>}
          <div className="input-footer">
            AI can make mistakes. Verify important information with official administration.
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
