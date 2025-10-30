// Markdown Document Viewer and PDF Generator with Streaming Chat
class MarkdownViewer {
  constructor() {
    this.currentContent = '';
    this.currentTitle = '';
    this.currentDocId = null;
    this.chatOpen = false;
    this.chatMessages = [];
    this.streamAbortController = null;
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Close viewer
    document.getElementById('closeViewer')?.addEventListener('click', () => {
      this.closeViewer();
    });

    // Download PDF
    document.getElementById('downloadPDF')?.addEventListener('click', () => {
      this.generatePDF();
    });

    // Toggle chat
    document.getElementById('chatToggle')?.addEventListener('click', () => {
      this.toggleChat();
    });

    // Send chat message
    document.getElementById('chatSend')?.addEventListener('click', () => {
      this.sendMessage();
    });

    // Enter to send (Shift+Enter for new line)
    document.getElementById('chatInput')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    // Add download chat button dynamically
    this.addDownloadChatButton();

    // Click outside to close
    const dialog = document.getElementById('viewer');
    dialog?.addEventListener('click', (e) => {
      const rect = dialog.getBoundingClientRect();
      const outside = e.clientX < rect.left || e.clientX > rect.right || 
                     e.clientY < rect.top || e.clientY > rect.bottom;
      if (outside) this.closeViewer();
    });

    // Escape key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && dialog?.open) {
        this.closeViewer();
      }
    });
  }

  // Add download chat button to input container
  addDownloadChatButton() {
    const chatInputContainer = document.querySelector('.chat-input-container');
    if (!chatInputContainer) return;

    // Create button container for stacked buttons
    const buttonStack = document.createElement('div');
    buttonStack.className = 'chat-button-stack';
    buttonStack.innerHTML = `
      <button id="chatDownload" class="chat-download-btn" title="Download conversation">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
        </svg>
      </button>
    `;

    // Find send button and replace with stack
    const sendButton = document.getElementById('chatSend');
    if (sendButton) {
      // Move send button into stack
      chatInputContainer.removeChild(sendButton);
      buttonStack.appendChild(sendButton);
      chatInputContainer.appendChild(buttonStack);

      // Add download listener
      document.getElementById('chatDownload')?.addEventListener('click', () => {
        this.downloadChatHistory();
      });
    }
  }

  // Download chat history as markdown
  downloadChatHistory() {
    if (this.chatMessages.length === 0) {
      alert('No conversation to download yet.');
      return;
    }

    // Build markdown content
    let markdown = `# Chat with ${this.currentTitle}\n\n`;
    markdown += `Date: ${new Date().toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    })}\n\n`;
    markdown += `---\n\n`;

    this.chatMessages.forEach((msg, index) => {
      const role = msg.role === 'user' ? '**You**' : '**Assistant**';
      markdown += `${role}: ${msg.content}\n\n`;
    });

    // Create blob and download
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat_${this.currentTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Open formatted markdown viewer
  openViewer(markdownContent, title, docId) {
    if (!marked || typeof marked.parse !== 'function') {
      console.error('Marked.js library not loaded');
      alert('Markdown library not loaded. Please refresh the page.');
      return;
    }

    // If switching documents, close existing stream
    if (this.currentDocId && this.currentDocId !== docId) {
      console.log('Switching documents, closing existing stream');
      this.closeStream();
    }

    this.currentContent = markdownContent;
    this.currentTitle = title;
    this.currentDocId = docId;
    this.workflowId = null;
    this.chatMessages = [];
    this.chatOpen = false;

    const dialog = document.getElementById('viewer');
    const titleElement = document.getElementById('viewerTitle');
    const viewerFrame = document.getElementById('viewerFrame');
    const container = document.querySelector('.viewer-container');
    const chatToggle = document.getElementById('chatToggle');

    // Set title
    if (titleElement) {
      titleElement.textContent = title || 'Research Document';
    }

    // Reset chat state
    if (container) {
      container.classList.remove('chat-open');
    }
    if (chatToggle) {
      chatToggle.classList.remove('active');
    }

    try {
      // Convert markdown to HTML
      const htmlContent = marked.parse(markdownContent);
      
      // Insert formatted content
      if (viewerFrame) {
        viewerFrame.innerHTML = htmlContent;
        viewerFrame.className = 'viewer-content';
      }

      // Show dialog
      if (dialog) {
        dialog.showModal();
      }
    } catch (error) {
      console.error('Error rendering markdown:', error);
      if (viewerFrame) {
        viewerFrame.innerHTML = `<div class="error">Failed to render document: ${error.message}</div>`;
      }
      if (dialog) {
        dialog.showModal();
      }
    }
  }

  // Toggle chat panel
  toggleChat() {
    this.chatOpen = !this.chatOpen;
    
    const container = document.querySelector('.viewer-container');
    const chatToggle = document.getElementById('chatToggle');
    const chatDocTitle = document.getElementById('chatDocTitle');
    
    if (this.chatOpen) {
      container?.classList.add('chat-open');
      chatToggle?.classList.add('active');
      
      if (chatDocTitle) {
        chatDocTitle.textContent = this.currentTitle;
      }
      
      if (this.chatMessages.length === 0) {
        this.showChatEmptyState();
      } else {
        this.renderChatMessages();
      }
      
    } else {
      container?.classList.remove('chat-open');
      chatToggle?.classList.remove('active');
    }
  }

  // Show empty state in chat
  showChatEmptyState() {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;
    
    chatMessages.innerHTML = `
      <div class="chat-empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <p>Ask questions about this document to get deeper insights</p>
      </div>
    `;
  }

  // Send chat message with streaming
  async sendMessage() {
    const chatInput = document.getElementById('chatInput');
    const chatSend = document.getElementById('chatSend');
    if (!chatInput) return;
    
    const message = chatInput.value.trim();
    if (!message) return;
    
    // Add user message to UI immediately
    this.addMessage('user', message);
    
    // Clear input and disable
    chatInput.value = '';
    chatInput.disabled = true;
    if (chatSend) chatSend.disabled = true;
    
    // Show thinking indicator
    this.addThinkingMessage();
    
    try {
      console.log('Sending message for document:', this.currentDocId);
      
      // Build conversation history for context
      const conversationHistory = this.chatMessages
        .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
        .join('\n');
      
      // Call async execution with history
      const response = await vertesiaAPI.chatWithDocument({
        document_id: this.currentDocId,
        question: message,
        conversation_history: conversationHistory
      });
      
      console.log('Async response:', response);
      
      // Open a new stream for this message
      this.openStream(response.workflowId, response.runId);
      
    } catch (error) {
      console.error('Chat error:', error);
      this.removeThinkingMessage();
      this.addMessage('assistant', 'Sorry, there was an error processing your question.');
      
      chatInput.disabled = false;
      if (chatSend) chatSend.disabled = false;
      chatInput.focus();
    }
  }

  // Open streaming connection (new stream for each message)
  openStream(workflowId, runId) {
    console.log('Opening new stream for workflowId:', workflowId, 'runId:', runId);
    
    this.streamAbortController = new AbortController();
    
    vertesiaAPI.streamWorkflowMessages(
      workflowId,
      runId,
      this.streamAbortController.signal,
      
      // onMessage - called for each message chunk
      (data) => {
        console.log('Stream message received:', data);
        
        // Only show messages with type: "complete" - that's the final answer
        if (data.type === 'complete' && data.message) {
          this.removeThinkingMessage();
          this.addMessage('assistant', data.message);
          this.reEnableInput(); // Re-enable immediately when answer appears
        }
      },
      
      // onComplete - called when stream ends
      () => {
        console.log('Stream completed');
        this.streamAbortController = null;
        // Input already re-enabled when answer received
      },
      
      // onError - called on error
      (error) => {
        console.error('Stream error:', error);
        this.removeThinkingMessage();
        this.addMessage('assistant', 'Sorry, there was an error with the response stream.');
        this.streamAbortController = null;
        this.reEnableInput();
      }
    );
  }

  // Close streaming connection
  closeStream() {
    if (this.streamAbortController) {
      console.log('Aborting stream');
      this.streamAbortController.abort();
      this.streamAbortController = null;
    }
  }

  // Add thinking indicator
  addThinkingMessage() {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;
    
    const thinkingDiv = document.createElement('div');
    thinkingDiv.className = 'chat-message assistant thinking';
    thinkingDiv.id = 'thinking-indicator';
    thinkingDiv.innerHTML = `
      <div class="chat-message-bubble">
        <div class="thinking-dots">
          <span></span><span></span><span></span>
        </div>
      </div>
    `;
    
    chatMessages.appendChild(thinkingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  // Remove thinking indicator
  removeThinkingMessage() {
    const thinking = document.getElementById('thinking-indicator');
    if (thinking) thinking.remove();
  }

  // Re-enable input after response
  reEnableInput() {
    const chatInput = document.getElementById('chatInput');
    const chatSend = document.getElementById('chatSend');
    
    if (chatInput) {
      chatInput.disabled = false;
      chatInput.focus();
    }
    if (chatSend) {
      chatSend.disabled = false;
    }
  }

  // Add message to chat
  addMessage(role, content) {
    const timestamp = new Date().toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit' 
    });
    
    this.chatMessages.push({ role, content, timestamp });
    this.renderChatMessages();
  }

  // Render all chat messages
  renderChatMessages() {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;
    
    chatMessages.innerHTML = this.chatMessages.map(msg => `
      <div class="chat-message ${msg.role}">
        <div class="chat-message-bubble">${this.escapeHtml(msg.content)}</div>
        <div class="chat-message-time">${msg.timestamp}</div>
      </div>
    `).join('');
    
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  // Escape HTML to prevent XSS
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Close viewer and cleanup
  closeViewer() {
    const dialog = document.getElementById('viewer');
    const viewerFrame = document.getElementById('viewerFrame');
    const container = document.querySelector('.viewer-container');
    const chatToggle = document.getElementById('chatToggle');
    
    // Close any active stream
    this.closeStream();
    
    if (viewerFrame) {
      viewerFrame.innerHTML = '';
      viewerFrame.className = 'viewer-content';
    }

    if (container) {
      container.classList.remove('chat-open');
    }
    if (chatToggle) {
      chatToggle.classList.remove('active');
    }
    
    this.chatOpen = false;
    this.chatMessages = [];

    if (dialog?.open) {
      dialog.close();
    }

    this.currentContent = '';
    this.currentTitle = '';
    this.currentDocId = null;
  }

  // Generate PDF from current content
  async generatePDF() {
    if (!this.currentContent) {
      console.error('No content to generate PDF');
      return;
    }

    await this.generatePDFFromContent(this.currentContent, this.currentTitle);
  }

  // Generate PDF from content
  async generatePDFFromContent(content, title) {
    if (!window.html2pdf) {
      console.error('html2pdf library not loaded');
      return;
    }

    try {
      const htmlContent = marked.parse(content);
      
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlContent;
      
      this.applyInlineStyles(tempDiv);
      
      document.body.appendChild(tempDiv);
      
      const filename = `${title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      
      const pdfOptions = {
        margin: 0.5,
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
      };
      
      await html2pdf().set(pdfOptions).from(tempDiv).save();
      
      document.body.removeChild(tempDiv);
      
    } catch (error) {
      console.error('PDF generation failed:', error);
    }
  }

  // Apply inline styles for PDF generation
  applyInlineStyles(container) {
    container.style.cssText = `
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #1f2d3d;
      max-width: 900px;
      margin: 0 auto;
      padding: 30px 40px;
    `;
    
    container.querySelectorAll('h1').forEach(h1 => {
      h1.style.cssText = `
        font-size: 28px;
        color: #336F51;
        border-bottom: 3px solid #336F51;
        padding-bottom: 12px;
        margin: 30px 0 20px 0;
        font-weight: 700;
      `;
    });
    
    container.querySelectorAll('h2').forEach(h2 => {
      h2.style.cssText = `
        font-size: 22px;
        color: #1f2d3d;
        margin: 25px 0 15px 0;
        font-weight: 600;
        border-left: 4px solid #336F51;
        padding-left: 12px;
      `;
    });

    container.querySelectorAll('h3').forEach(h3 => {
      h3.style.cssText = `
        font-size: 18px;
        color: #1f2d3d;
        margin: 20px 0 12px 0;
        font-weight: 600;
      `;
    });
    
    container.querySelectorAll('p').forEach(p => {
      p.style.cssText = 'margin-bottom: 16px; text-align: justify;';
    });
    
    container.querySelectorAll('strong').forEach(strong => {
      strong.style.cssText = 'color: #336F51; font-weight: 600;';
    });

    container.querySelectorAll('ul, ol').forEach(list => {
      list.style.cssText = 'margin: 16px 0; padding-left: 24px;';
    });

    container.querySelectorAll('li').forEach(li => {
      li.style.cssText = 'margin-bottom: 8px;';
    });
    
    container.querySelectorAll('table').forEach(table => {
      table.style.cssText = `
        width: 100%;
        border-collapse: collapse;
        margin: 20px 0;
        font-size: 14px;
      `;
      
      table.querySelectorAll('th').forEach(th => {
        th.style.cssText = `
          background-color: #f8f9fb;
          border: 1px solid #e0e5ea;
          padding: 12px 8px;
          text-align: left;
          font-weight: 600;
        `;
      });
      
      table.querySelectorAll('td').forEach(td => {
        td.style.cssText = `
          border: 1px solid #e0e5ea;
          padding: 10px 8px;
          text-align: left;
        `;
      });

      table.querySelectorAll('tr:nth-child(even)').forEach(tr => {
        tr.style.backgroundColor = '#fafbfc';
      });
    });
  }
}

// Create global instance
const markdownViewer = new MarkdownViewer();
