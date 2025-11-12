// Markdown Document Viewer and PDF Generator with Streaming Chat + TOC
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
    
    // Panel tabs (Chat / Follow Up)
    document.querySelectorAll('.panel-tab').forEach(tab => {
      tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
    });
    
    // Follow Up context input
    document.getElementById('followupContext')?.addEventListener('input', (e) => {
      this.updateFollowupCharCount();
      this.updateFollowupButton();
    });
    
    // Generate Follow Up button
    document.getElementById('generateFollowup')?.addEventListener('click', () => {
      this.generateFollowUp();
    });
    
    // Follow up modifier segmented controls
    this.setupFollowupModifiers();

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

  // Extract headings from markdown
  extractHeadings(markdown) {
    const headings = [];
    const lines = markdown.split('\n');
    
    lines.forEach((line, index) => {
      // Match markdown headings (# H1, ## H2, ### H3)
      const match = line.match(/^(#{1,3})\s+(.+)$/);
      if (match) {
        const level = match[1].length;
        const text = match[2].trim();
        const id = this.generateHeadingId(text);
        headings.push({ level, text, id });
      }
    });
    
    return headings;
  }

  // Generate heading ID from text
  generateHeadingId(text) {
    // Handle case where text might be an object or have HTML
    let cleanText;
    if (typeof text === 'string') {
      cleanText = text;
    } else if (text && typeof text.toString === 'function') {
      cleanText = text.toString();
    } else {
      cleanText = String(text || '');
    }
    
    // Strip HTML tags if any
    const strippedText = cleanText.replace(/<[^>]*>/g, '');
    
    return strippedText
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  // Render markdown with IDs on headings
 // Render markdown with IDs on headings
renderMarkdownWithIds(markdown) {
  // First, let's try a simpler approach by processing the markdown before rendering
  const processedMarkdown = this.addHeadingIds(markdown);
  return marked.parse(processedMarkdown);
}

// Add IDs to headings in the markdown text directly
addHeadingIds(markdown) {
  const lines = markdown.split('\n');
  
  return lines.map(line => {
    // Match markdown headings (# H1, ## H2, ### H3)
    const match = line.match(/^(#{1,3})\s+(.+)$/);
    if (match) {
      const hashes = match[1];
      const text = match[2].trim();
      const id = this.generateHeadingId(text);
      
      // Convert to HTML heading with ID
      const level = hashes.length;
      return `<h${level} id="${id}">${text}</h${level}>`;
    }
    return line;
  }).join('\n');
}
  // Build TOC HTML
  buildTOC(headings) {
    if (headings.length === 0) {
      return '<div class="toc-empty">No sections found</div>';
    }
    
    return headings.map(h => `
      <div class="toc-item toc-level-${h.level}" data-target="${h.id}">
        <span class="toc-text">${h.text}</span>
      </div>
    `).join('');
  }

  // Setup TOC navigation
  setupTOCNavigation() {
    const tocItems = document.querySelectorAll('.toc-item');
    
    tocItems.forEach(item => {
      item.addEventListener('click', () => {
        const targetId = item.dataset.target;
        const targetElement = document.getElementById(targetId);
        
        if (targetElement) {
          // Smooth scroll to target
          targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          
          // Highlight active item
          tocItems.forEach(i => i.classList.remove('active'));
          item.classList.add('active');
        }
      });
    });
    
    // Track scroll position to highlight active section
    const viewerDocument = document.querySelector('.viewer-document');
    if (viewerDocument) {
      viewerDocument.addEventListener('scroll', () => {
        this.updateActiveTOCItem();
      });
    }
  }

 // Update active TOC item based on scroll position
updateActiveTOCItem() {
  const tocItems = document.querySelectorAll('.toc-item');
  const headings = document.querySelectorAll('.viewer-document h1, .viewer-document h2, .viewer-document h3');
  
  if (headings.length === 0) return;
  
  let activeHeading = headings[0]; // Default to first heading
  let minDistance = Infinity;
  
  headings.forEach(heading => {
    const rect = heading.getBoundingClientRect();
    // Calculate distance from top of viewport (accounting for some offset)
    const distance = Math.abs(rect.top - 50);
    
    // If this heading is closer to our target position (50px from top)
    if (distance < minDistance && rect.top <= 200) {
      minDistance = distance;
      activeHeading = heading;
    }
  });
  
  // Update TOC highlighting
  tocItems.forEach(item => {
    if (item.dataset.target === activeHeading.id) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
}

  // Open formatted markdown viewer with TOC
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
      // Extract headings for TOC
      const headings = this.extractHeadings(markdownContent);
      
      // Convert markdown to HTML with IDs on headings
      const htmlContent = this.renderMarkdownWithIds(markdownContent);
      
      // Insert formatted content with TOC
      if (viewerFrame) {
        viewerFrame.innerHTML = `
          <div class="viewer-toc">
            <div class="toc-header">Contents</div>
            <div class="toc-list">
              ${this.buildTOC(headings)}
            </div>
          </div>
          <div class="viewer-document">
            ${htmlContent}
          </div>
        `;
        viewerFrame.className = 'viewer-content with-toc';
        
        // Add click handlers to TOC items
        this.setupTOCNavigation();
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
  
  // Declare flag BEFORE the function call
  let answerReceived = false;
  
  vertesiaAPI.streamWorkflowMessages(
    workflowId,
    runId,
    this.streamAbortController.signal,
    
    // onMessage - arrow function, not object property
    (data) => {
      if (data.type === 'answer' && data.message && !answerReceived) {
        answerReceived = true;
        this.removeThinkingMessage();
        this.addMessage('assistant', data.message);
        this.reEnableInput();
      }
    },
    
    // onComplete
    () => {
      console.log('Stream completed');
      this.streamAbortController = null;
    },
    
    // onError
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

  // Format assistant message content for readability
  formatChatMessage(content) {
    if (!content) return '';
    
    // Escape HTML first for security
    const div = document.createElement('div');
    div.textContent = content;
    let formatted = div.innerHTML;
    
    // Headers (## Header or ### Header)
    formatted = formatted.replace(/^###\s+(.+)$/gm, '<h3 class="chat-h3">$1</h3>');
    formatted = formatted.replace(/^##\s+(.+)$/gm, '<h2 class="chat-h2">$1</h2>');
    
    // Bold text (**text**) - handle multiline with [\s\S] instead of .
    formatted = formatted.replace(/\*\*([^\*]+?)\*\*/g, '<strong>$1</strong>');
    
    // Convert bullet points (• or - or * at start of line) to styled list items
    formatted = formatted.replace(/^[•\-\*]\s+(.+)$/gm, '<div class="chat-bullet">• $1</div>');
    
    // Numbered lists (1. item)
    formatted = formatted.replace(/^\d+\.\s+(.+)$/gm, '<div class="chat-numbered">$1</div>');
    
    // Convert double line breaks to spacing
    formatted = formatted.replace(/\n\n+/g, '</p><p>');
    
    // Wrap in paragraph
    formatted = '<p>' + formatted + '</p>';
    
    // Clean up empty paragraphs
    formatted = formatted.replace(/<p>\s*<\/p>/g, '');
    
    return formatted;
  }

  // Render all chat messages
  renderChatMessages() {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;
    
    chatMessages.innerHTML = this.chatMessages.map(msg => {
      // Format assistant messages for readability, escape user messages
      const content = msg.role === 'assistant' 
        ? this.formatChatMessage(msg.content)
        : this.escapeHtml(msg.content);
      
      return `
        <div class="chat-message ${msg.role}">
          <div class="chat-message-bubble">${content}</div>
          <div class="chat-message-time">${msg.timestamp}</div>
        </div>
      `;
    }).join('');
    
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
      // Parse markdown to HTML
      const htmlContent = marked.parse(content);
      
      // Create temporary container with proper styling
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlContent;
      
      // Apply comprehensive inline styles
      tempDiv.style.cssText = `
        position: fixed;
        left: -10000px;
        top: 0;
        width: 800px;
        background: white;
        padding: 60px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        font-size: 14px;
        line-height: 1.6;
        color: #1f2d3d;
      `;
      
      // Style all elements
      this.applyInlineStyles(tempDiv);
      
      // Append to body
      document.body.appendChild(tempDiv);
      
      // Wait for rendering
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const filename = `${title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      
      const pdfOptions = {
        margin: [0.75, 0.75, 0.75, 0.75],
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          logging: false,
          letterRendering: true,
          allowTaint: true,
          backgroundColor: '#ffffff'
        },
        jsPDF: { 
          unit: 'in', 
          format: 'letter', 
          orientation: 'portrait',
          compress: true
        },
        pagebreak: { 
          mode: ['avoid-all', 'css', 'legacy'],
          before: '.page-break'
        }
      };
      
      await html2pdf().set(pdfOptions).from(tempDiv).save();
      
      // Clean up
      document.body.removeChild(tempDiv);
      
    } catch (error) {
      console.error('PDF generation failed:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  }

  // Apply inline styles for PDF generation
  applyInlineStyles(container) {
    // Remove conflicting container styles - parent already sets width
    container.style.cssText = `
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #1f2d3d;
      background: white;
    `;
    
    container.querySelectorAll('h1').forEach(h1 => {
      h1.style.cssText = `
        display: block;
        font-size: 28px;
        color: #336F51;
        border-bottom: 3px solid #336F51;
        padding-bottom: 12px;
        margin: 30px 0 20px 0;
        font-weight: 700;
        page-break-after: avoid;
      `;
    });
    
    container.querySelectorAll('h2').forEach(h2 => {
      h2.style.cssText = `
        display: block;
        font-size: 22px;
        color: #1f2d3d;
        margin: 25px 0 15px 0;
        font-weight: 600;
        border-left: 4px solid #336F51;
        padding-left: 12px;
        page-break-after: avoid;
      `;
    });

    container.querySelectorAll('h3').forEach(h3 => {
      h3.style.cssText = `
        display: block;
        font-size: 18px;
        color: #1f2d3d;
        margin: 20px 0 12px 0;
        font-weight: 600;
        page-break-after: avoid;
      `;
    });
    
    container.querySelectorAll('p').forEach(p => {
      p.style.cssText = `
        display: block;
        margin: 0 0 16px 0;
        text-align: justify;
        line-height: 1.6;
      `;
    });
    
    container.querySelectorAll('strong').forEach(strong => {
      strong.style.cssText = `
        display: inline;
        color: #336F51;
        font-weight: 600;
      `;
    });

    container.querySelectorAll('ul, ol').forEach(list => {
      list.style.cssText = `
        display: block;
        margin: 16px 0;
        padding-left: 24px;
      `;
    });

    container.querySelectorAll('li').forEach(li => {
      li.style.cssText = `
        display: list-item;
        margin-bottom: 8px;
        line-height: 1.6;
      `;
    });
    
    container.querySelectorAll('table').forEach(table => {
      table.style.cssText = `
        display: table;
        width: 100%;
        border-collapse: collapse;
        margin: 20px 0;
        font-size: 14px;
        page-break-inside: avoid;
      `;
      
      table.querySelectorAll('th').forEach(th => {
        th.style.cssText = `
          display: table-cell;
          background-color: #f8f9fb;
          border: 1px solid #e0e5ea;
          padding: 12px 8px;
          text-align: left;
          font-weight: 600;
        `;
      });
      
      table.querySelectorAll('td').forEach(td => {
        td.style.cssText = `
          display: table-cell;
          border: 1px solid #e0e5ea;
          padding: 10px 8px;
          text-align: left;
        `;
      });

      table.querySelectorAll('tr:nth-child(even)').forEach(tr => {
        tr.style.backgroundColor = '#fafbfc';
      });
    });
    
    // Ensure code blocks are styled if present
    container.querySelectorAll('code').forEach(code => {
      code.style.cssText = `
        display: inline;
        font-family: 'Courier New', Courier, monospace;
        background: #f5f5f5;
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 13px;
      `;
    });
    
    container.querySelectorAll('pre').forEach(pre => {
      pre.style.cssText = `
        display: block;
        background: #f5f5f5;
        padding: 16px;
        border-radius: 6px;
        overflow-x: auto;
        margin: 16px 0;
        page-break-inside: avoid;
      `;
    });
  }
  
  // ===== FOLLOW UP RESEARCH METHODS =====
  
  // Switch between Chat and Follow Up tabs
  switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.panel-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabName);
    });
    
    // Update tab content
    document.getElementById('chatTab')?.classList.toggle('hidden', tabName !== 'chat');
    document.getElementById('followupTab')?.classList.toggle('hidden', tabName !== 'followup');
  }
  
  // Setup segmented controls for Follow Up modifiers
  setupFollowupModifiers() {
    const modifiersContainer = document.getElementById('followupModifiers');
    if (!modifiersContainer) return;
    
    modifiersContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('.seg-option');
      if (!btn) return;
      
      const seg = btn.closest('.seg');
      if (!seg) return;
      
      // Update active state
      seg.querySelectorAll('.seg-option').forEach(option => {
        option.classList.remove('is-active');
      });
      
      btn.classList.add('is-active');
    });
  }
  
  // Update character count for Follow Up context
  updateFollowupCharCount() {
    const textarea = document.getElementById('followupContext');
    const counter = document.getElementById('followupCharCount');
    
    if (textarea && counter) {
      counter.textContent = textarea.value.length;
    }
  }
  
  // Update Follow Up button state
  updateFollowupButton() {
    const textarea = document.getElementById('followupContext');
    const button = document.getElementById('generateFollowup');
    
    if (textarea && button) {
      button.disabled = textarea.value.trim().length === 0;
    }
  }
  
  // Get selected modifiers from Follow Up form
  getFollowupModifiers() {
    const modifiers = {};
    
    document.querySelectorAll('#followupModifiers .seg').forEach(seg => {
      const activeOption = seg.querySelector('.seg-option.is-active');
      if (activeOption) {
        const group = activeOption.dataset.group;
        const value = activeOption.dataset.value;
        if (group && value) {
          modifiers[group] = value;
        }
      }
    });
    
    return modifiers;
  }
  
  // Generate Follow Up research
  async generateFollowUp() {
    const contextInput = document.getElementById('followupContext');
    const button = document.getElementById('generateFollowup');
    
    if (!contextInput || !button) return;
    
    const context = contextInput.value.trim();
    if (!context) return;
    
    // Disable button during generation
    button.disabled = true;
    
    try {
      const modifiers = this.getFollowupModifiers();
      
      // Create research data for follow-up
      const researchData = {
        context: context,
        modifiers: modifiers,
        parent_document_id: this.currentDocId
      };
      
      // Start the follow-up research
      await researchEngine.startResearch(researchData);
      
      // Show brief toast notification
      this.showBriefToast('Follow-up research started');
      
      // Reset form
      contextInput.value = '';
      this.updateFollowupCharCount();
      button.disabled = true;
      
    } catch (error) {
      console.error('Failed to start follow-up research:', error);
      this.showBriefToast('Failed to start follow-up research');
      button.disabled = false;
    }
  }
  
  // Show brief toast notification (fades after 3 seconds)
  showBriefToast(message) {
    // Create toast if it doesn't exist
    let toast = document.getElementById('briefToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'briefToast';
      toast.className = 'brief-toast';
      document.body.appendChild(toast);
    }
    
    // Set message and show
    toast.textContent = message;
    toast.classList.remove('hide');
    toast.classList.add('show');
    
    // Hide after 3 seconds
    setTimeout(() => {
      toast.classList.remove('show');
      toast.classList.add('hide');
    }, 3000);
  }
}

// Create global instance
const markdownViewer = new MarkdownViewer();
