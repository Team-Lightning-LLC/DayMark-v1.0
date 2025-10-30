// Research Generation and Progress Management - Multi-Job Support
class ResearchEngine {
  constructor() {
    this.currentJobs = [];
    this.STORAGE_KEY = 'deepresearch_active_jobs';
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
        timers: { 
          refresh: null,
          autoDecrement: null
        }
      };
      
      this.currentJobs.push(job);
      
      // If less than 5 minutes elapsed, set auto-decrement timer for remaining time
      if (elapsed < 300) {
        const remaining = 300 - elapsed;
        job.timers.autoDecrement = setTimeout(() => {
          this.autoDecrementJob(job);
        }, remaining * 1000);
        
        // Also start polling after remaining time
        setTimeout(() => {
          this.startJobPolling(job);
        }, remaining * 1000);
      } else {
        // More than 5 minutes passed, start polling now and set immediate decrement
        job.timers.autoDecrement = setTimeout(() => {
          this.autoDecrementJob(job);
        }, 100); // Decrement almost immediately
        
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

      // Log to research history
      this.logResearchHistory(researchData);

      const newJob = {
        data: researchData,
        startTime: Date.now(),
        timers: { 
          refresh: null,
          autoDecrement: null
        }
      };

      this.currentJobs.push(newJob);
      this.saveJobsState();
      this.updateBadge();
      
      // Set 5-minute auto-decrement timer
      newJob.timers.autoDecrement = setTimeout(() => {
        this.autoDecrementJob(newJob);
      }, 5 * 60 * 1000); // 5 minutes
      
      // Start polling after 5 minutes
      setTimeout(() => {
        this.startJobPolling(newJob);
      }, 5 * 60 * 1000);

    } catch (error) {
      console.error('Failed to start research:', error);
      alert('Failed to start research generation. Please try again.');
    }
  }

  autoDecrementJob(job) {
    const jobIndex = this.currentJobs.indexOf(job);
    if (jobIndex === -1) return; // Job already removed
    
    // Clear timers
    if (job.timers.refresh) {
      clearInterval(job.timers.refresh);
    }
    if (job.timers.autoDecrement) {
      clearTimeout(job.timers.autoDecrement);
    }
    
    // Remove job
    this.currentJobs.splice(jobIndex, 1);
    this.saveJobsState();
    this.updateBadge();
    
    console.log('Job auto-decremented after 5 minutes');
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
      badge.innerHTML = `<span class="badge-spinner"></span> (${this.currentJobs.length}) Active Screens`;
      badge.style.display = 'inline-flex';
    } else {
      badge.style.display = 'none';
    }
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
      if (completedJob.timers.autoDecrement) {
        clearTimeout(completedJob.timers.autoDecrement);
      }
      
      this.currentJobs.shift();
    }
    
    this.saveJobsState();
    this.updateBadge();
  }

  logResearchHistory(researchData) {
    console.log('Logging research to history:', researchData);
    
    const historyEntry = {
      timestamp: new Date().toISOString(),
      capability: researchData.capability,
      framework: researchData.framework,
      context: researchData.context,
      modifiers: {
        scope: researchData.modifiers.scope,
        overviewDetails: researchData.modifiers["Overview Details"],
        analyticalRigor: researchData.modifiers["Analytical Rigor"],
        perspective: researchData.modifiers.perspective
      }
    };

    try {
      const history = JSON.parse(localStorage.getItem('research_history') || '[]');
      history.push(historyEntry);
      localStorage.setItem('research_history', JSON.stringify(history));
      console.log('Research logged successfully. Total entries:', history.length);
      console.log('Logged entry:', historyEntry);
    } catch (error) {
      console.error('Failed to log research history:', error);
    }
  }

  downloadHistory() {
    console.log('Download history button clicked');
    
    try {
      const history = JSON.parse(localStorage.getItem('research_history') || '[]');
      console.log('History entries found:', history.length);
      console.log('History data:', history);
      
      if (history.length === 0) {
        alert('No research history to download. Submit a research request first.');
        return;
      }

      const dataStr = JSON.stringify(history, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `research-history-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      console.log(`Downloaded ${history.length} research entries`);
    } catch (error) {
      console.error('Failed to download history:', error);
      alert('Failed to download research history. Check console for details.');
    }
  }
}

const researchEngine = new ResearchEngine();

// History download button
document.addEventListener('DOMContentLoaded', () => {
  const downloadBtn = document.getElementById('downloadHistory');
  if (downloadBtn) {
    console.log('History download button found, attaching listener');
    downloadBtn.addEventListener('click', () => {
      console.log('History download button clicked');
      researchEngine.downloadHistory();
    });
  } else {
    console.warn('History download button not found in DOM');
  }
});
