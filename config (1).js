// Deep Research Agent Configuration
const CONFIG = {
  // Vertesia API Configuration
  VERTESIA_API_BASE: 'https://api.vertesia.io/api/v1',
  VERTESIA_API_KEY: 'sk-2538a58567e4ebb6654c0a17ceab228c',
  ENVIRONMENT_ID: '681915c6a01fb262a410c161',
  MODEL: 'publishers/anthropic/models/claude-3-7-sonnet',
  
  // Research Agent Configuration
  INTERACTION_NAME: 'ResearchV2',
  
  // Research Capabilities
  RESEARCH_CAPABILITIES: {
    "Traditional Analysis": [
      "General Analysis",
      "Margin & Return Metrics",
      "Debt & Liquidity Assessment",
      "Porter's Five Forces",
      "SWOT Analysis",
      "DCF Valuation"
    ],
    
    "Ecosystem Focused": [
      "Ecosystem Mapping",
      "Supply Chain Contagion Modeling"
    ],
    
    "Narrative Centric": [
      "Narrative Momentum Analysis",
      "Competitive Response Patterns",
      "Leadership and Management Quality Assessment"
    ],
    
    "Comparative": [
      "Multi-asset Time Series Analysis",
      "Multi-asset Head to Head evaluation",
      "Technology Adoption Curves",
      "Exposures and Business Models"
    ],
    
    "Scenario Modeling": [
      "Risk Correlation Study",
      "Industry Consolidation: M&A",
      "Monetary Policy & Interest Rate"
    ],
    
    "Company Insights": [
      "Talent Landscape",
      "Alliance & Partnerships: Past, Current, Future",
      "Industry Trend Analysis"
    ],
    
    "Custom Research": [
      "Custom"
    ]
  },
  
  // Context Hints for Each Framework
  CONTEXT_HINTS: {
    // Traditional Analysis
    "General Analysis": "Enter company or topic for comprehensive analysis (e.g., NVIDIA, semiconductor industry)",
    "Margin & Return Metrics": "Enter company for profitability analysis (e.g., NVIDIA margins, Microsoft ROIC, Apple ROE)",
    "Debt & Liquidity Assessment": "Enter company for balance sheet health (e.g., AT&T debt load, Tesla liquidity, Boeing solvency)",
    "Porter's Five Forces": "Enter company/industry (e.g., Tesla in EV market, Netflix in streaming)",
    "SWOT Analysis": "Enter company for strengths, weaknesses, opportunities, threats (e.g., Apple, Microsoft)",
    "DCF Valuation": "Enter company for discounted cash flow valuation (e.g., NVDA, GOOGL, TSLA)",
    
    // Ecosystem Focused
    "Ecosystem Mapping": "Enter company to map suppliers, partners, competitors, dependencies (e.g., Apple, Tesla)",
    "Supply Chain Contagion Modeling": "Describe disruption scenario (e.g., Taiwan semiconductor shutdown, China rare earth embargo)",
    
    // Narrative Centric
    "Narrative Momentum Analysis": "Enter narrative theme and companies (e.g., AI leader narrative: NVDA, GOOGL, MSFT, META)",
    "Competitive Response Patterns": "Enter companies for historical competitive behavior (e.g., Amazon vs Walmart over 10 years)",
    "Leadership and Management Quality Assessment": "Enter company to evaluate leadership effectiveness (e.g., Microsoft under Nadella, Apple post-Jobs)",
    
    // Comparative
    "Multi-asset Time Series Analysis": "Enter 2-3 assets with timeframe (e.g., NVDA, AMD, INTC from 2020-2025)",
    "Multi-asset Head to Head evaluation": "Enter 2+ companies for direct comparison (e.g., Tesla vs Rivian vs Lucid: product, financials, market position)",
    "Technology Adoption Curves": "Enter technology and sectors (e.g., AI adoption: healthcare vs finance vs manufacturing)",
    "Exposures and Business Models": "Enter companies to analyze revenue streams, market dependencies, and business model resilience (e.g., Apple, Amazon)",
    
    // Scenario Modeling
    "Risk Correlation Study": "Enter companies to map interconnected risks (e.g., oil prices impact on airlines, shipping, retail)",
    "Industry Consolidation: M&A": "Enter industry or companies for M&A analysis (e.g., semiconductor consolidation, potential Adobe-Figma scenarios)",
    "Monetary Policy & Interest Rate": "Enter companies/sectors to analyze interest rate sensitivity (e.g., REITs, utilities, tech growth stocks)",
    
    // Company Insights
    "Talent Landscape": "Enter industry or company for workforce analysis (e.g., semiconductor engineers, AI researchers at Google)",
    "Alliance & Partnerships: Past, Current, Future": "Enter company to map partnerships and predict future alliances (e.g., Microsoft, Starbucks)",
    "Industry Trend Analysis": "Enter industry and timeframe (e.g., renewable energy 2020-2030, semiconductor cycles)",
    
    // Custom Research
    "Custom Framework": "Describe your research question or analytical approach in detail. Be as specific as possible."
  },
  
  // Framework Auto-Defaults for Modifiers
  FRAMEWORK_DEFAULTS: {
    "DCF Valuation": { 
      scope: "Assets", 
      depth: "Comprehensive", 
      rigor: "Exhaustive Research", 
      perspective: "Investment" 
    },
    "General Analysis": { 
      scope: "Assets", 
      depth: "Comprehensive", 
      rigor: "Detailed Analysis", 
      perspective: "Investment" 
    },
    "Supply Chain Contagion Modeling": { 
      scope: "Market", 
      depth: "Comprehensive", 
      rigor: "Exhaustive Research", 
      perspective: "Technical" 
    },
    "Multi-asset Time Series Analysis": { 
      scope: "Assets", 
      depth: "Comprehensive", 
      rigor: "Detailed Analysis", 
      perspective: "Investment" 
    }
  },
  
  // Research Generation Settings
  GENERATION: {
    ESTIMATED_TIME_MINUTES: 5,
    POLLING_INTERVAL_MS: 15000,
    POLLING_START_DELAY_MS: 5 * 60 * 1000,
    MAX_POLLING_ATTEMPTS: 20
  },
  
  // Document Settings
  DOCUMENTS: {
    PREFIX: 'DeepResearch_',
    BATCH_SIZE: 100
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
