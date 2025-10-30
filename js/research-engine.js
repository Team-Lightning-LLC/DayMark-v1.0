// Research Generation and Progress Management - Multi-Job Support
class ResearchEngine {
  constructor() {
    this.currentJobs = [];
    this.STORAGE_KEY = 'deepresearch_active_jobs';
    this.statusRotationTimer = null;
    this.statusMessages = [
      "Fetching Pages",
      "Citing Sources", 
      "Connecting Dots",
      "Analyzing Content",
      "Reading Sources",
      "Synthesizing Data",
      "Building Report"
    ];
    this.restoreJobsFromStorage();
  }

  saveJobsState() {
    const jobsState = this.currentJobs.map(job => ({
      capability: job.data.capability,
      framework: job.data.framework,
      scope: job.data.modifiers.scope,
      overviewDetails: job.data.modifiers["Overview Details"],
      analyticalRigor: job.data.modifiers["Analytical Rigor"],
      perspective: job.data.modifiers.perspective,
      startTime: job.startTime
    }));
    
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(jobsState));
    } catch (error) {
      console.error('Failed to save jobs state:', error);
    }
  }

  loadJobsState() {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (!saved) return [];
      
      const jobsState = JSON.parse(saved);
      const now = Date.now();
      
      const validJobs = jobsState.filter(job => {
        const elapsed = (now - job.startTime) / 1000;
        return elapsed <= 1800;
      });
      
      return validJobs;
    } catch (error) {
      console.error('Failed to load jobs state:', error);
      this.clearJobsState();
      return [];
    }
  }

  clearJobsState() {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear jobs state:', error);
    }
  }

  restoreJobsFromStorage() {
    const savedJobs = this.loadJobsState();
    if (savedJobs.length === 0) return;
    
    savedJobs.forEach(savedJob => {
      const elapsed = (Date.now() - savedJob.startTime) / 1000;
      
      const job = {
        data: {
          capability: savedJob.capability,
          framework: savedJob.framework,
          modifiers: {
            scope: savedJob.scope,
            "Overview Details": savedJob.overviewDetails,
            "Analytical Rigor": savedJob.analyticalRigor,
            perspective: savedJob.perspective
          }
        },
        startTime: savedJob.startTime,
        timers: { refresh: null }
      };
      
      this.currentJobs.push(job);
      
      if (elapsed < 300) {
        const remaining = 300 - elapsed;
        setTimeout(() => {
          this.startJobPolling(job);
        }, remaining * 1000);
      } else {
        this.startJobPolling(job);
      }
    });
    
    this.updateBadge();
  }

  async startResearch(researchData) {
    try {
      const prompt = this.buildResearchPrompt(researchData);
      
      const jobResponse = await vertesiaAPI.executeAsync({
        Task: prompt
      });

      const newJob = {
        data: researchData,
        startTime: Date.now(),
        timers: { refresh: null }
      };

      this.currentJobs.push(newJob);
      this.saveJobsState();
      this.updateBadge();
      
      setTimeout(() => {
        this.startJobPolling(newJob);
      }, 5 * 60 * 1000);

    } catch (error) {
      console.error('Failed to start research:', error);
      alert('Failed to start research generation. Please try again.');
    }
  }

  buildResearchPrompt(data) {
    return `
Utilize Web Search to develop a singular document utilizing the following structure as the guide to provide users with a valuable research document: 
Analysis Type: ${data.capability}
Framework: ${data.framework}

Utilize this context to gain additional insight into your research topic:
${data.context}

The Research Parameters you must follow for this document are:
- Scope: ${data.modifiers.scope}
- Overview Detail: ${data.modifiers["Overview Details"]}
- Analytical Rigor: ${data.modifiers["Analytical Rigor"]}
- Perspective: ${data.modifiers.perspective}

All web searches must acknowledge that the current date is 10.21.2025 when searching for the most recent data. Search for the most recent data unless otherwise specified. Always capture the most recent reliable data. The final output must be a document uploaded to the content object library. Please produce a singular document for this research.
    `.trim();
  }

  updateBadge() {
    const badge = document.getElementById('activeJobsBadge');
    if (!badge) return;
    
    if (this.currentJobs.length > 0) {
      // Start rotation if not already running
      if (!this.statusRotationTimer) {
        this.startStatusRotation();
      }
      
      badge.style.display = 'inline-block';
    } else {
      // Stop rotation when no jobs
      if (this.statusRotationTimer) {
        clearInterval(this.statusRotationTimer);
        this.statusRotationTimer = null;
      }
      
      badge.style.display = 'none';
    }
  }

  startStatusRotation() {
    const badge = document.getElementById('activeJobsBadge');
    if (!badge) return;
    
    // Update immediately
    this.updateBadgeText();
    
    // Then rotate every 2 seconds
    this.statusRotationTimer = setInterval(() => {
      this.updateBadgeText();
    }, 2000);
  }

  updateBadgeText() {
    const badge = document.getElementById('activeJobsBadge');
    if (!badge) return;
    
    // Pick random status message
    const randomIndex = Math.floor(Math.random() * this.statusMessages.length);
    const status = this.statusMessages[randomIndex];
    
    badge.textContent = `${status} (${this.currentJobs.length})`;
  }

  startJobPolling(job) {
    this.checkForNewDocuments();
    
    job.timers.refresh = setInterval(() => {
      this.checkForNewDocuments();
    }, 10000);
  }

  async checkForNewDocuments() {
    try {
      if (window.app) {
        const previousCount = window.app.documents.length;
        await window.app.refreshDocuments();
        const newCount = window.app.documents.length;
        
        if (newCount > previousCount) {
          const docsAdded = newCount - previousCount;
          this.handleNewDocuments(docsAdded);
        }
      }
    } catch (error) {
      console.error('Error checking for documents:', error);
    }
  }

  handleNewDocuments(count) {
    for (let i = 0; i < count && this.currentJobs.length > 0; i++) {
      const completedJob = this.currentJobs[0];
      
      if (completedJob.timers.refresh) {
        clearInterval(completedJob.timers.refresh);
      }
      
      this.currentJobs.shift();
    }
    
    this.saveJobsState();
    
    // Update badge immediately to reflect new count
    if (this.currentJobs.length > 0) {
      this.updateBadgeText();
    }
    
    this.updateBadge();
  }
}

const researchEngine = new ResearchEngine();
