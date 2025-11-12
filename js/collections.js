// Collections System v2 - Clean with sorting
class CollectionsManager {
  constructor(app) {
    this.app = app;
    this.collections = [];
    this.selectedCollections = new Set(); // Empty = show all
    this.sortMode = 'most'; // 'most', 'least', 'alphabetical'
    
    this.init();
  }

  init() {
    this.loadCollections();
    this.renderCollections();
    this.setupEventListeners();
    console.log('Collections v2 initialized');
  }

  // ===== STORAGE =====

  loadCollections() {
    const stored = localStorage.getItem('scout_collections');
    this.collections = stored ? JSON.parse(stored) : [];
  }

  saveCollections() {
    localStorage.setItem('scout_collections', JSON.stringify(this.collections));
  }

  // ===== EVENT LISTENERS =====

  setupEventListeners() {
    // Sort buttons
    const sortButtons = document.querySelectorAll('.sort-btn');
    sortButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.sort;
        this.setSortMode(mode);
      });
    });

    // Collection list (event delegation)
    const list = document.getElementById('collectionsList');
    list?.addEventListener('click', (e) => {
      const item = e.target.closest('.collection-item');
      if (!item) return;

      const deleteBtn = e.target.closest('.btn-delete-collection');
      const collectionId = item.dataset.collectionId;

      if (deleteBtn && collectionId !== '__create__') {
        e.stopPropagation();
        this.deleteCollection(collectionId);
      } else if (collectionId === '__create__') {
        this.createCollection();
      } else {
        this.toggleSelection(collectionId);
      }
    });
  }

  // ===== SORTING =====

  setSortMode(mode) {
    this.sortMode = mode;
    
    // Update active button
    document.querySelectorAll('.sort-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.sort === mode);
    });
    
    this.renderCollections();
  }

  getSortedCollections() {
    const sorted = [...this.collections];
    
    switch (this.sortMode) {
      case 'most':
        return sorted.sort((a, b) => b.document_ids.length - a.document_ids.length);
      case 'least':
        return sorted.sort((a, b) => a.document_ids.length - b.document_ids.length);
      case 'alphabetical':
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      default:
        return sorted;
    }
  }

  // ===== RENDERING =====

  renderCollections() {
    const list = document.getElementById('collectionsList');
    if (!list) return;

    // "Create New Collection" - always first
    const createHtml = `
      <div class="collection-item collection-item-create" data-collection-id="__create__">
        <div class="create-icon">+</div>
        <div class="collection-info">
          <div class="collection-name">Create New Collection</div>
        </div>
      </div>
    `;

    // Sorted user collections
    const sortedCollections = this.getSortedCollections();
    const userHtml = sortedCollections.map(c => {
      const selected = this.selectedCollections.has(c.id);
      return `
        <div class="collection-item ${selected ? 'selected' : ''}" data-collection-id="${c.id}">
          <div class="collection-checkbox">
            <input type="checkbox" ${selected ? 'checked' : ''} readonly>
          </div>
          <div class="collection-info">
            <div class="collection-name">${c.name}</div>
            <div class="collection-count">${c.document_ids.length}</div>
          </div>
          <button class="btn-delete-collection" title="Delete">×</button>
        </div>
      `;
    }).join('');

    list.innerHTML = createHtml + userHtml;
  }

  // ===== SELECTION =====

  toggleSelection(collectionId) {
    if (this.selectedCollections.has(collectionId)) {
      this.selectedCollections.delete(collectionId);
    } else {
      this.selectedCollections.add(collectionId);
    }

    this.renderCollections();
    this.app.filterAndRenderDocuments();
  }

  // Check if document should be shown based on selected collections
  shouldShowDocument(docId) {
    // If nothing selected, show all documents
    if (this.selectedCollections.size === 0) {
      return true;
    }

    // Check if document is in any selected collection
    for (const collectionId of this.selectedCollections) {
      const collection = this.collections.find(c => c.id === collectionId);
      if (collection && collection.document_ids.includes(docId)) {
        return true;
      }
    }

    return false;
  }

  // ===== CRUD =====

  createCollection() {
    const name = prompt('Collection name:');
    if (!name || !name.trim()) return;

    const newCollection = {
      id: Date.now().toString(),
      name: name.trim(),
      document_ids: [],
      created: new Date().toISOString()
    };

    this.collections.push(newCollection);
    this.saveCollections();
    this.renderCollections();
  }

  deleteCollection(collectionId) {
    if (!confirm('Delete this collection? Documents will not be deleted.')) return;

    this.collections = this.collections.filter(c => c.id !== collectionId);
    this.selectedCollections.delete(collectionId);

    this.saveCollections();
    this.renderCollections();
    this.app.filterAndRenderDocuments();
  }

  // Modal for adding documents to collections
  showAddToCollectionModal(documentId) {
    if (this.collections.length === 0) {
      alert('Create a collection first!');
      return;
    }

    const modal = document.createElement('div');
    modal.className = 'collection-modal show';
    modal.innerHTML = `
      <div class="collection-modal-content">
        <div class="collection-modal-header">Add to Collections</div>
        <div class="collection-modal-list">
          ${this.collections.map(c => {
            const checked = c.document_ids.includes(documentId);
            return `
              <label class="collection-checkbox-item">
                <input type="checkbox" value="${c.id}" ${checked ? 'checked' : ''}>
                <span>${c.name}</span>
              </label>
            `;
          }).join('')}
        </div>
        <div class="collection-modal-footer">
          <button class="btn-modal-cancel">Cancel</button>
          <button class="btn-modal-save">Save</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const close = () => modal.remove();
    
    modal.querySelector('.btn-modal-cancel').addEventListener('click', close);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) close();
    });

    modal.querySelector('.btn-modal-save').addEventListener('click', () => {
      const checkboxes = modal.querySelectorAll('input[type="checkbox"]');
      
      checkboxes.forEach(cb => {
        const collection = this.collections.find(c => c.id === cb.value);
        if (cb.checked) {
          if (!collection.document_ids.includes(documentId)) {
            collection.document_ids.push(documentId);
          }
        } else {
          collection.document_ids = collection.document_ids.filter(id => id !== documentId);
        }
      });

      this.saveCollections();
      this.renderCollections();
      this.app.filterAndRenderDocuments();
      close();
    });
  }

  // Get selected collection names for header
  getSelectedNames() {
    if (this.selectedCollections.size === 0) {
      return 'All Documents';
    }

    const names = Array.from(this.selectedCollections).map(id => {
      const c = this.collections.find(col => col.id === id);
      return c ? c.name : '';
    }).filter(Boolean);

    return names.join(' + ');
  }
}

window.CollectionsManager = CollectionsManager;
