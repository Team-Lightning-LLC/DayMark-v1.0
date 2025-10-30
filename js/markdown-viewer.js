// Markdown Document Viewer and PDF Generator with Chat
class MarkdownViewer {
  constructor() {
    this.currentContent = '';
    this.currentTitle = '';
    this.currentDocId = null;
    this.conversationId = null;
    this.chatOpen = false;
    this.chatMessages = [];
    this.activeChatJob = null;
    this.chatPollTimer = null;
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

  // Open formatted markdown viewer
  openViewer(markdownContent, title, docId) {
    if (!marked || typeof marked.parse !== 'function') {
      console.error('Marked.js library not loaded');
      alert('Markdown library not loaded. Please refresh the page.');
      return;
    }

    this.currentContent = markdownContent;
    this.currentTitle = title;
    this.currentDocId = docId;
    this.conversationId = null;
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

  // Send chat message
  async sendMessage() {
    const chatInput = document.getElementById('chatInput');
    const chatSend = document.getElementById('chatSend');
    if (!chatInput) return;
    
    const message = chatInput.value.trim();
    if (!message) return;
    
    this.addMessage('user', message);
    
    chatInput.value = '';
    chatInput.disabled = true;
    if (chatSend) chatSend.disabled = true;
    
    this.addThinkingMessage();
    
    try {
      let jobResponse;
      
      if (!this.conversationId) {
        console.log('Starting new conversation for document:', this.currentDocId);
        jobResponse = await vertesiaAPI.startDocumentConversation({
          document_id: this.currentDocId,
          question: message
        });
        
        console.log('Full API response:', jobResponse);
        
        this.conversationId = jobResponse.conversationId || jobResponse.workflowId || jobResponse.id;
        console.log('Conversation started:', this.conversationId);
        
      } else {
        console.log('Continuing conversation:', this.conversationId);
        jobResponse = await vertesiaAPI.continueDocumentConversation(
          this.conversationId,
          message
        );
        
        console.log('Continue response:', jobResponse);
      }
      
      this.activeChatJob = {
        runId: jobResponse.runId || jobResponse.id,
        startTime: Date.now()
      };
      
      console.log('Polling with runId:', this.activeChatJob.runId);
      
      this.startChatPolling();
      
    } catch (error) {
      console.error('Chat error:', error);
      this.removeThinkingMessage();
      this.addMessage('assistant', 'Sorry, there was an error processing your question.');
      
      chatInput.disabled = false;
      if (chatSend) chatSend.disabled = false;
      chatInput.focus();
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

  // Start polling for chat result
  startChatPolling() {
    let pollCount = 0;
    const maxPolls = 30;
    
    this.chatPollTimer = setInterval(async () => {
      pollCount++;
      
      try {
        console.log(`Polling attempt ${pollCount} for runId:`, this.activeChatJob.runId);
        
        const runData = await vertesiaAPI.getChatJobStatus(this.activeChatJob.runId);
        
        console.log('Run status:', runData.status);
        console.log('Full run data:', runData);
        
        if (runData.status === 'completed' || runData.status === 'success') {
          this.removeThinkingMessage();
          
          let answer = 'Response received.';
          
          if (runData.result) {
            if (typeof runData.result === 'string') {
              answer = runData.result;
            } else if (runData.result.answer) {
              answer = runData.result.answer;
            } else if (runData.result.output) {
              answer = runData.result.output;
            } else if (runData.result.response) {
              answer = runData.result.response;
            } else {
              answer = JSON.stringify(runData.result);
            }
          }
          
          console.log('Extracted answer:', answer);
          this.addMessage('assistant', answer);
          
          this.stopChatPolling();
          this.reEnableInput();
          
        } else if (runData.status === 'failed' || runData.status === 'error') {
          console.error('Run failed:', runData);
          this.removeThinkingMessage();
          this.addMessage('assistant', 'Sorry, there was an error generating the response.');
          
          this.stopChatPolling();
          this.reEnableInput();
        }
        
        if (pollCount >= maxPolls) {
          console.error('Polling timeout after', maxPolls, 'attempts');
          this.removeThinkingMessage();
          this.addMessage('assistant', 'Request timed out. Please try again.');
          
          this.stopChatPolling();
          this.reEnableInput();
        }
        
      } catch (error) {
        console.error('Polling error:', error);
        
        if (pollCount >= maxPolls) {
          this.removeThinkingMessage();
          this.addMessage('assistant', 'Error checking response status.');
          
          this.stopChatPolling();
          this.reEnableInput();
        }
      }
    }, 2000);
  }

  // Stop chat polling
  stopChatPolling() {
    if (this.chatPollTimer) {
      clearInterval(this.chatPollTimer);
      this.chatPollTimer = null;
    }
    this.activeChatJob = null;
  }

  // Re-enable input
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

  // Format chat message content for display
  formatChatMessage(content) {
    if (!content) return '';
    
    // Convert bullet points (• or - at start of line) to styled list items
    content = content.replace(/^[•\-]\s+(.+)$/gm, '<div class="chat-bullet">• $1</div>');
    
    // Convert numbered lists (1. or 2. etc)
    content = content.replace(/^\d+\.\s+(.+)$/gm, '<div class="chat-numbered">$1</div>');
    
    // Bold text (**text** or __text__)
    content = content.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    content = content.replace(/__(.+?)__/g, '<strong>$1</strong>');
    
    // Convert double line breaks to paragraphs
    content = content.replace(/\n\n+/g, '</p><p>');
    content = '<p>' + content + '</p>';
    
    // Convert single line breaks to <br>
    content = content.replace(/\n/g, '<br>');
    
    // Clean up empty paragraphs
    content = content.replace(/<p>\s*<\/p>/g, '');
    
    return content;
  }

  // Render all chat messages
  renderChatMessages() {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;
    
    chatMessages.innerHTML = this.chatMessages.map(msg => {
      const formattedContent = msg.role === 'assistant' 
        ? this.formatChatMessage(msg.content)
        : msg.content; // Don't format user messages
      
      return `
        <div class="chat-message ${msg.role}">
          <div class="chat-message-bubble">${formattedContent}</div>
          <div class="chat-message-time">${msg.timestamp}</div>
        </div>
      `;
    }).join('');
    
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  // Close viewer and reset
  closeViewer() {
    const dialog = document.getElementById('viewer');
    const viewerFrame = document.getElementById('viewerFrame');
    const container = document.querySelector('.viewer-container');
    const chatToggle = document.getElementById('chatToggle');
    
    this.stopChatPolling();
    
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
    this.conversationId = null;

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
