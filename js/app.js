// Main Application Logic
class DeepResearchApp {
  constructor() {
    this.documents = [];
    this.filteredDocuments = [];
    this.currentFilter = 'All';
    this.searchQuery = '';
    
    this.init();
  }

  async init() {
    this.setupEventListeners();
    await this.loadDocuments();
    this.filterAndRenderDocuments();
    console.log('Deep Research Agent initialized');
  }

  setupEventListeners() {
    // Capability/Framework cascade
    const capabilitySelect = document.getElementById('capability');
    const frameworkSelect = document.getElementById('framework');
    const contextInput = document.getElementById('contextInput');
    const createBtn = document.getElementById('createBtn');

    capabilitySelect?.addEventListener('change', () => {
      this.updateFrameworkOptions();
      this.updateCreateButton();
    });

    frameworkSelect?.addEventListener('change', () => {
      this.updateContextPlaceholder();
      this.applyFrameworkDefaults();
      this.updateCreateButton();
    });

    contextInput?.addEventListener('input', (e) => {
      this.updateCharacterCount();
      this.updateCreateButton();
    });

    createBtn?.addEventListener('click', () => {
      this.startResearch();
    });

    // Search functionality
    const searchInput = document.getElementById('docSearch');
    searchInput?.addEventListener('input', (e) => {
      this.searchQuery = e.target.value.toLowerCase();
      this.filterAndRenderDocuments();
    });

    // Filter chips
    const filterChips = document.querySelectorAll('.chip');
    filterChips.forEach(chip => {
      chip.addEventListener('click', () => {
        filterChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        this.currentFilter = chip.dataset.filter;
        this.filterAndRenderDocuments();
      });
    });

    // Segmented controls
    this.setupSegmentedControls();

    // Document actions
    this.setupDocumentActions();
  }

  // Update framework dropdown based on selected capability
  updateFrameworkOptions() {
    const capabilitySelect = document.getElementById('capability');
    const frameworkSelect = document.getElementById('framework');
    
    if (!capabilitySelect || !frameworkSelect) return;
    
    const selectedCapability = capabilitySelect.value;
    frameworkSelect.innerHTML = '<option value="">Select framework...</option>';
    
    const frameworks = CONFIG.RESEARCH_CAPABILITIES[selectedCapability] || [];
    frameworks.forEach(framework => {
      const option = document.createElement('option');
      option.value = framework;
      option.textContent = framework;
      frameworkSelect.appendChild(option);
    });
    
    frameworkSelect.disabled = frameworks.length === 0;
  }

  // Update context placeholder based on selected framework
  updateContextPlaceholder() {
    const frameworkSelect = document.getElementById('framework');
    const contextInput = document.getElementById('contextInput');
    
    if (!frameworkSelect || !contextInput) return;
    
    const selectedFramework = frameworkSelect.value;
    const hint = CONFIG.CONTEXT_HINTS[selectedFramework];
    
    contextInput.placeholder = hint || "Describe your research needs in detail...";
    
    // Expand textarea for Custom Framework
    if (selectedFramework === "Custom Framework") {
      contextInput.rows = 5;
    } else {
      contextInput.rows = 3;
    }
  }

  // Apply framework defaults to modifiers
  applyFrameworkDefaults() {
    const frameworkSelect = document.getElementById('framework');
    if (!frameworkSelect) return;
    
    const selectedFramework = frameworkSelect.value;
    const defaults = CONFIG.FRAMEWORK_DEFAULTS[selectedFramework];
    
    if (!defaults) return;
    
    // Apply each default
    Object.keys(defaults).forEach(group => {
      const value = defaults[group];
      const seg = document.querySelector(`[data-group="${group}"]`)?.closest('.seg');
      
      if (seg) {
        // Deactivate all options in this group
        seg.querySelectorAll('.seg-option').forEach(option => {
          option.classList.remove('is-active');
          option.setAttribute('aria-checked', 'false');
        });
        
        // Activate the default option
        const defaultOption = seg.querySelector(`[data-value="${value}"]`);
        if (defaultOption) {
          defaultOption.classList.add('is-active');
          defaultOption.setAttribute('aria-checked', 'true');
        }
      }
    });
  }

  // Update character count
  updateCharacterCount() {
    const contextInput = document.getElementById('contextInput');
    const charCount = document.getElementById('charCount');
    
    if (!contextInput || !charCount) return;
    
    charCount.textContent = contextInput.value.length;
  }

  // Update create button state
  updateCreateButton() {
    const capabilitySelect = document.getElementById('capability');
    const frameworkSelect = document.getElementById('framework');
    const contextInput = document.getElementById('contextInput');
    const createBtn = document.getElementById('createBtn');
    
    if (!capabilitySelect || !frameworkSelect || !contextInput || !createBtn) return;
    
    const hasCapability = capabilitySelect.value !== "";
    const hasFramework = frameworkSelect.value !== "";
    const hasContext = contextInput.value.trim().length >= 1;
    
    createBtn.disabled = !(hasCapability && hasFramework && hasContext);
  }

  // Setup segmented control interactions
  setupSegmentedControls() {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.seg-option');
      if (!btn) return;
      
      const seg = btn.closest('.seg');
      if (!seg) return;
      
      // Update active state
      seg.querySelectorAll('.seg-option').forEach(option => {
        option.classList.remove('is-active');
        option.setAttribute('aria-checked', 'false');
      });
      
      btn.classList.add('is-active');
      btn.setAttribute('aria-checked', 'true');
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
      
      const seg = e.target.closest('.seg');
      if (!seg) return;
      
      const options = [...seg.querySelectorAll('.seg-option')];
      const currentIndex = options.findIndex(o => o.classList.contains('is-active'));
      const nextIndex = e.key === 'ArrowRight' 
        ? (currentIndex + 1) % options.length
        : (currentIndex - 1 + options.length) % options.length;
      
      // Update active state
      options[currentIndex].classList.remove('is-active');
      options[nextIndex].classList.add('is-active');
      options[nextIndex].focus();
      
      e.preventDefault();
    });
  }

  // Setup document action handlers
  setupDocumentActions() {
    const docsPane = document.getElementById('docsPane');
    
    docsPane?.addEventListener('click', async (e) => {
      const action = e.target.closest('.doc-action');
      if (!action) return;
      
      const docElement = action.closest('.doc');
      const docId = docElement?.dataset.docId;
      
      if (!docId) return;
      
      if (action.classList.contains('view-action')) {
        await this.viewDocument(docId);
      } else if (action.classList.contains('download-action')) {
        await this.downloadDocument(docId);
      } else if (action.classList.contains('delete-action')) {
        await this.deleteDocument(docId);
      }
    });
  }

  // Get current research parameters
  getResearchParameters() {
    const params = {};
    
    document.querySelectorAll('.seg').forEach(seg => {
      const activeOption = seg.querySelector('.seg-option.is-active');
      if (activeOption) {
        const group = activeOption.dataset.group;
        const value = activeOption.dataset.value;
        if (group && value) {
          params[group] = value;
        }
      }
    });
    
    return params;
  }

  // Start research generation
async startResearch() {
  const capabilitySelect = document.getElementById('capability');
  const frameworkSelect = document.getElementById('framework');
  const contextInput = document.getElementById('contextInput');
  
  if (!capabilitySelect?.value || !frameworkSelect?.value || !contextInput?.value) return;
  
  const researchData = {
    capability: capabilitySelect.value,
    framework: frameworkSelect.value,
    context: contextInput.value.trim(),
    modifiers: this.getResearchParameters()
  };
  
  await researchEngine.startResearch(researchData);
  
  //Reset form after successful submit
  capabilitySelect.value = '';
  frameworkSelect.innerHTML = '<option value="">Choose capability first...</option>';
  frameworkSelect.disabled = true;
  contextInput.value = '';
  document.getElementById('charCount').textContent = '0';
  document.getElementById('createBtn').disabled = true;
}
  // Load all documents from API
  async loadDocuments() {
    try {
      console.log('Loading all documents...');
      
      const response = await fetch(`${CONFIG.VERTESIA_API_BASE}/objects?limit=1000&offset=0`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${CONFIG.VERTESIA_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`API call failed: ${response.status} ${response.statusText}`);
      }
      
      const allObjects = await response.json();
      console.log('Loaded all objects:', allObjects.length);
      
      this.documents = [];
      for (const obj of allObjects) {
        try {
          const transformed = this.transformDocument(obj);
          this.documents.push(transformed);
        } catch (error) {
          console.error('Failed to transform:', obj.name, error);
        }
      }
      
      this.documents.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      console.log('Final documents array:', this.documents.length);
      
    } catch (error) {
      console.error('Failed to load documents:', error);
      this.documents = [];
    }
  }

  // Transform API object to document format
  transformDocument(obj) {
    let title = obj.name || 'Untitled';
    
    const prefixes = ['DeepResearch_', 'Deep Research_', 'deep research_', 'DEEP RESEARCH_', 'DEEP RESEARCH:'];
    prefixes.forEach(prefix => {
      if (title.startsWith(prefix)) {
        title = title.substring(prefix.length);
      }
    });
    
    title = title.replace(/[_-]/g, ' ').trim();
    
    return {
      id: obj.id,
      title: title,
      area: obj.properties?.capability || '',
      topic: obj.properties?.framework || '',
      created_at: obj.created_at || obj.properties?.generated_at || new Date().toISOString(),
      content_source: obj.content?.source,
      when: this.formatDate(obj.created_at || obj.properties?.generated_at)
    };
  }

  // Format date for display
  formatDate(dateString) {
    if (!dateString) return 'Recent';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
    } catch {
      return 'Recent';
    }
  }

  // Filter and render documents
  filterAndRenderDocuments() {
    this.filteredDocuments = this.documents.filter(doc => {
      const matchesSearch = !this.searchQuery || 
        [doc.title, doc.area, doc.topic].some(field => 
          field && field.toLowerCase().includes(this.searchQuery)
        );
      
      return matchesSearch;
    });
    
    this.renderDocuments();
  }

  // Render document list
  renderDocuments() {
    const docsPane = document.getElementById('docsPane');
    if (!docsPane) {
      console.error('docsPane element not found');
      return;
    }
    
    if (this.filteredDocuments.length === 0) {
      docsPane.innerHTML = '<div class="empty">No documents found.</div>';
      return;
    }
    
    const html = this.filteredDocuments.map(doc => `
      <div class="doc" data-doc-id="${doc.id}">
        <div class="doc-info">
          <div class="tt">${doc.title}</div>
          <div class="meta">${doc.when} - ${doc.area} - ${doc.topic}</div>
        </div>
        <div class="actions">
          <button class="doc-action view-action">view</button>
          <button class="doc-action download-action">download</button>
          <button class="doc-action delete-action">delete</button>
        </div>
      </div>
    `).join('');
    
    docsPane.innerHTML = html;
  }

// View document
async viewDocument(docId) {
  try {
    const doc = this.documents.find(d => d.id === docId);
    if (!doc) return;
    
    const downloadResponse = await fetch(`${CONFIG.VERTESIA_API_BASE}/objects/download-url`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CONFIG.VERTESIA_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        file: doc.content_source,
        format: 'original'
      })
    });
    
    if (!downloadResponse.ok) {
      throw new Error(`Failed to get download URL: ${downloadResponse.statusText}`);
    }
    
    const downloadData = await downloadResponse.json();
    
    const contentResponse = await fetch(downloadData.url);
    if (!contentResponse.ok) {
      throw new Error(`Failed to download content: ${contentResponse.statusText}`);
    }
    
    const content = await contentResponse.text();
    
    // Pass docId to viewer
    markdownViewer.openViewer(content, doc.title, docId);  // <-- Added docId
    
  } catch (error) {
    console.error('Failed to view document:', error);
    alert('Failed to load document. Please try again.');
  }
}

  // Download document as PDF
  async downloadDocument(docId) {
    try {
      const doc = this.documents.find(d => d.id === docId);
      if (!doc) return;
      
      console.log('Downloading document:', doc.title);
      
      const downloadResponse = await fetch(`${CONFIG.VERTESIA_API_BASE}/objects/download-url`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CONFIG.VERTESIA_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          file: doc.content_source,
          format: 'original'
        })
      });
      
      if (!downloadResponse.ok) {
        throw new Error(`Failed to get download URL: ${downloadResponse.statusText}`);
      }
      
      const downloadData = await downloadResponse.json();
      
      const contentResponse = await fetch(downloadData.url);
      if (!contentResponse.ok) {
        throw new Error(`Failed to download content: ${contentResponse.statusText}`);
      }
      
      const content = await contentResponse.text();
      
      await markdownViewer.generatePDFFromContent(content, doc.title);
      
    } catch (error) {
      console.error('Failed to download document:', error);
      alert('Failed to download document. Please try again.');
    }
  }

  // Delete document
  async deleteDocument(docId) {
    if (!confirm('Are you sure you want to delete this document?')) return;
    
    try {
      const response = await fetch(`${CONFIG.VERTESIA_API_BASE}/objects/${docId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${CONFIG.VERTESIA_API_KEY}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete: ${response.statusText}`);
      }
      
      await this.refreshDocuments();
    } catch (error) {
      console.error('Failed to delete document:', error);
      alert('Failed to delete document. Please try again.');
    }
  }

  // Refresh document library
  async refreshDocuments() {
    await this.loadDocuments();
    this.filterAndRenderDocuments();
  }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.app = new DeepResearchApp();
});
