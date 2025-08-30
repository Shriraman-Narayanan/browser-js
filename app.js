// Application data and configuration
const APP_DATA = {
  llm_providers: [
    {
      id: "openai",
      name: "OpenAI GPT",
      base_url: "https://api.openai.com/v1",
      models: ["gpt-4", "gpt-4-turbo", "gpt-3.5-turbo"],
      requires_key: true
    },
    {
      id: "anthropic",
      name: "Anthropic Claude",
      base_url: "https://api.anthropic.com/v1",
      models: ["claude-3-sonnet", "claude-3-haiku"],
      requires_key: true
    },
    {
      id: "gemini",
      name: "Google Gemini",
      base_url: "https://generativelanguage.googleapis.com/v1beta",
      models: ["gemini-pro", "gemini-pro-vision"],
      requires_key: true
    },
    {
      id: "aipipe",
      name: "AI Pipe",
      base_url: "https://aipipe.org/openrouter/v1",
      models: ["openai/gpt-4", "anthropic/claude-3-sonnet"],
      requires_key: true,
      description: "Access LLMs without backend via AI Pipe proxy"
    }
  ],
  available_tools: [
    {
      name: "google_search",
      display_name: "Google Search",
      description: "Search the web using Google Custom Search API",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The search query to execute"
          },
          num_results: {
            type: "integer",
            description: "Number of results to return (1-10)",
            minimum: 1,
            maximum: 10,
            default: 5
          }
        },
        required: ["query"]
      }
    },
    {
      name: "ai_pipe_request",
      display_name: "AI Pipe Request",
      description: "Make flexible API calls through AI Pipe proxy",
      parameters: {
        type: "object",
        properties: {
          endpoint: {
            type: "string",
            description: "API endpoint to call"
          },
          method: {
            type: "string",
            description: "HTTP method",
            enum: ["GET", "POST", "PUT", "DELETE"],
            default: "GET"
          },
          data: {
            type: "object",
            description: "Request data/payload"
          }
        },
        required: ["endpoint"]
      }
    },
    {
      name: "execute_javascript",
      display_name: "JavaScript Execution",
      description: "Execute JavaScript code in a sandboxed environment",
      parameters: {
        type: "object",
        properties: {
          code: {
            type: "string",
            description: "JavaScript code to execute"
          }
        },
        required: ["code"]
      }
    }
  ]
};

// Application state
let appState = {
  llm_config: {
    provider: null,
    model: null,
    api_key: '',
    base_url: ''
  },
  tool_config: {
    google_search_enabled: true,
    google_api_key: '',
    search_engine_id: '',
    ai_pipe_enabled: true,
    js_execution_enabled: true
  },
  conversation: [],
  is_connected: false,
  agent_loop_active: false,
  agent_state: 'ready'
};

// DOM elements - will be populated after DOM loads
let elements = {};

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
  initializeElements();
  initializeApp();
  attachEventListeners();
  loadStoredConfig();
});

function initializeElements() {
  elements = {
    // Header elements
    configureProviderBtn: document.getElementById('configureProviderBtn'),
    toolConfigBtn: document.getElementById('toolConfigBtn'),
    clearChatBtn: document.getElementById('clearChatBtn'),
    
    // Status elements
    connectionStatus: document.getElementById('connectionStatus'),
    agentStatus: document.getElementById('agentStatus'),
    
    // Chat elements
    chatMessages: document.getElementById('chatMessages'),
    messageInput: document.getElementById('messageInput'),
    sendBtn: document.getElementById('sendBtn'),
    typingIndicator: document.getElementById('typingIndicator'),
    
    // Provider modal elements
    providerModal: document.getElementById('providerModal'),
    closeProviderModal: document.getElementById('closeProviderModal'),
    providerSelect: document.getElementById('providerSelect'),
    modelSelect: document.getElementById('modelSelect'),
    apiKeyInput: document.getElementById('apiKeyInput'),
    toggleApiKey: document.getElementById('toggleApiKey'),
    baseUrlInput: document.getElementById('baseUrlInput'),
    testConnectionBtn: document.getElementById('testConnectionBtn'),
    saveConfigBtn: document.getElementById('saveConfigBtn'),
    connectionResult: document.getElementById('connectionResult'),
    
    // Tool modal elements
    toolModal: document.getElementById('toolModal'),
    closeToolModal: document.getElementById('closeToolModal'),
    googleSearchEnabled: document.getElementById('googleSearchEnabled'),
    googleApiKey: document.getElementById('googleApiKey'),
    searchEngineId: document.getElementById('searchEngineId'),
    aiPipeEnabled: document.getElementById('aiPipeEnabled'),
    jsExecutionEnabled: document.getElementById('jsExecutionEnabled'),
    saveToolConfigBtn: document.getElementById('saveToolConfigBtn'),
    
    // Alert container
    alertContainer: document.getElementById('alertContainer')
  };
}

function initializeApp() {
  // Populate provider dropdown
  APP_DATA.llm_providers.forEach(provider => {
    const option = document.createElement('option');
    option.value = provider.id;
    option.textContent = provider.name;
    elements.providerSelect.appendChild(option);
  });
  
  updateAgentStatus('Ready');
  updateConnectionStatus(false);
}

function attachEventListeners() {
  // Header buttons
  elements.configureProviderBtn.addEventListener('click', function(e) {
    e.preventDefault();
    showModal('provider');
  });
  
  elements.toolConfigBtn.addEventListener('click', function(e) {
    e.preventDefault();
    showModal('tool');
  });
  
  elements.clearChatBtn.addEventListener('click', function(e) {
    e.preventDefault();
    clearConversation();
  });
  
  // Chat input
  elements.messageInput.addEventListener('input', handleMessageInputChange);
  elements.messageInput.addEventListener('keydown', handleMessageInputKeydown);
  elements.sendBtn.addEventListener('click', function(e) {
    e.preventDefault();
    sendMessage();
  });
  
  // Provider modal
  elements.closeProviderModal.addEventListener('click', function(e) {
    e.preventDefault();
    hideModal('provider');
  });
  
  elements.providerSelect.addEventListener('change', handleProviderChange);
  elements.modelSelect.addEventListener('change', handleModelChange);
  elements.apiKeyInput.addEventListener('input', handleApiKeyChange);
  elements.toggleApiKey.addEventListener('click', toggleApiKeyVisibility);
  elements.testConnectionBtn.addEventListener('click', testConnection);
  elements.saveConfigBtn.addEventListener('click', saveProviderConfig);
  
  // Tool modal
  elements.closeToolModal.addEventListener('click', function(e) {
    e.preventDefault();
    hideModal('tool');
  });
  
  elements.googleSearchEnabled.addEventListener('change', handleToolToggle);
  elements.aiPipeEnabled.addEventListener('change', handleToolToggle);
  elements.jsExecutionEnabled.addEventListener('change', handleToolToggle);
  elements.saveToolConfigBtn.addEventListener('click', saveToolConfig);
  
  // Modal backdrop clicks
  elements.providerModal.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal-backdrop')) {
      hideModal('provider');
    }
  });
  
  elements.toolModal.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal-backdrop')) {
      hideModal('tool');
    }
  });
  
  // Escape key to close modals
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      hideModal('provider');
      hideModal('tool');
    }
  });
}

// Configuration Management
function loadStoredConfig() {
  try {
    const storedLLMConfig = localStorage.getItem('llm_agent_config');
    const storedToolConfig = localStorage.getItem('tool_config');
    
    if (storedLLMConfig) {
      appState.llm_config = JSON.parse(storedLLMConfig);
      populateProviderModal();
      if (appState.llm_config.provider && appState.llm_config.api_key) {
        updateConnectionStatus(true);
      }
    }
    
    if (storedToolConfig) {
      appState.tool_config = JSON.parse(storedToolConfig);
      populateToolModal();
    }
  } catch (error) {
    console.warn('Failed to load stored config:', error);
  }
}

function saveConfig() {
  try {
    localStorage.setItem('llm_agent_config', JSON.stringify(appState.llm_config));
    localStorage.setItem('tool_config', JSON.stringify(appState.tool_config));
  } catch (error) {
    showAlert('Failed to save configuration', 'error');
  }
}

function populateProviderModal() {
  if (appState.llm_config.provider) {
    elements.providerSelect.value = appState.llm_config.provider;
    handleProviderChange();
  }
  if (appState.llm_config.model) {
    elements.modelSelect.value = appState.llm_config.model;
  }
  if (appState.llm_config.api_key) {
    elements.apiKeyInput.value = appState.llm_config.api_key;
  }
  updateProviderModalState();
}

function populateToolModal() {
  elements.googleSearchEnabled.checked = appState.tool_config.google_search_enabled;
  elements.googleApiKey.value = appState.tool_config.google_api_key || '';
  elements.searchEngineId.value = appState.tool_config.search_engine_id || '';
  elements.aiPipeEnabled.checked = appState.tool_config.ai_pipe_enabled;
  elements.jsExecutionEnabled.checked = appState.tool_config.js_execution_enabled;
  updateToolConfigVisibility();
}

// Provider Configuration
function handleProviderChange() {
  const providerId = elements.providerSelect.value;
  const provider = APP_DATA.llm_providers.find(p => p.id === providerId);
  
  elements.modelSelect.innerHTML = '<option value="">Select a model...</option>';
  elements.modelSelect.disabled = !provider;
  
  if (provider) {
    provider.models.forEach(model => {
      const option = document.createElement('option');
      option.value = model;
      option.textContent = model;
      elements.modelSelect.appendChild(option);
    });
    
    elements.baseUrlInput.value = provider.base_url;
    elements.modelSelect.disabled = false;
  }
  
  updateProviderModalState();
}

function handleModelChange() {
  updateProviderModalState();
}

function handleApiKeyChange() {
  updateProviderModalState();
}

function updateProviderModalState() {
  const hasProvider = elements.providerSelect.value !== '';
  const hasModel = elements.modelSelect.value !== '';
  const hasApiKey = elements.apiKeyInput.value.trim() !== '';
  
  const canTest = hasProvider && hasModel && hasApiKey;
  const canSave = canTest;
  
  elements.testConnectionBtn.disabled = !canTest;
  elements.saveConfigBtn.disabled = !canSave;
}

function toggleApiKeyVisibility() {
  const input = elements.apiKeyInput;
  const button = elements.toggleApiKey;
  
  if (input.type === 'password') {
    input.type = 'text';
    button.textContent = '🙈';
  } else {
    input.type = 'password';
    button.textContent = '👁️';
  }
}

async function testConnection() {
  const provider = APP_DATA.llm_providers.find(p => p.id === elements.providerSelect.value);
  const model = elements.modelSelect.value;
  const apiKey = elements.apiKeyInput.value.trim();
  
  elements.testConnectionBtn.disabled = true;
  elements.testConnectionBtn.textContent = 'Testing...';
  elements.connectionResult.classList.add('hidden');
  
  try {
    // Create test configuration
    const testConfig = {
      provider: provider.id,
      model: model,
      api_key: apiKey,
      base_url: provider.base_url
    };
    
    // Test with simple message
    const testSuccess = await testLLMConnection(testConfig);
    
    if (testSuccess) {
      showConnectionResult('Connection successful! Ready to use.', 'success');
    } else {
      showConnectionResult('Connection failed. Please check your credentials.', 'error');
    }
  } catch (error) {
    showConnectionResult(`Connection error: ${error.message}`, 'error');
  } finally {
    elements.testConnectionBtn.disabled = false;
    elements.testConnectionBtn.textContent = 'Test Connection';
  }
}

async function testLLMConnection(config) {
  // Simulate connection test (in real implementation, make actual API call)
  await new Promise(resolve => setTimeout(resolve, 1500));
  return Math.random() > 0.2; // 80% success rate for demo
}

function showConnectionResult(message, type) {
  elements.connectionResult.textContent = message;
  elements.connectionResult.className = `connection-result ${type}`;
  elements.connectionResult.classList.remove('hidden');
}

function saveProviderConfig() {
  const provider = APP_DATA.llm_providers.find(p => p.id === elements.providerSelect.value);
  
  appState.llm_config = {
    provider: provider.id,
    model: elements.modelSelect.value,
    api_key: elements.apiKeyInput.value.trim(),
    base_url: provider.base_url
  };
  
  appState.is_connected = true;
  saveConfig();
  updateConnectionStatus(true);
  hideModal('provider');
  showAlert('LLM provider configuration saved!', 'success');
}

// Tool Configuration
function handleToolToggle() {
  updateToolConfigVisibility();
}

function updateToolConfigVisibility() {
  const googleConfig = document.getElementById('googleSearchConfig');
  if (googleConfig) {
    googleConfig.classList.toggle('disabled', !elements.googleSearchEnabled.checked);
  }
}

function saveToolConfig() {
  appState.tool_config = {
    google_search_enabled: elements.googleSearchEnabled.checked,
    google_api_key: elements.googleApiKey.value.trim(),
    search_engine_id: elements.searchEngineId.value.trim(),
    ai_pipe_enabled: elements.aiPipeEnabled.checked,
    js_execution_enabled: elements.jsExecutionEnabled.checked
  };
  
  saveConfig();
  hideModal('tool');
  showAlert('Tool configuration saved!', 'success');
}

// Chat Interface
function handleMessageInputChange() {
  const hasText = elements.messageInput.value.trim().length > 0;
  elements.sendBtn.disabled = !hasText || !appState.is_connected || appState.agent_loop_active;
  
  // Auto-resize textarea
  elements.messageInput.style.height = 'auto';
  elements.messageInput.style.height = Math.min(elements.messageInput.scrollHeight, 120) + 'px';
}

function handleMessageInputKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    if (!elements.sendBtn.disabled) {
      sendMessage();
    }
  }
}

async function sendMessage() {
  const message = elements.messageInput.value.trim();
  if (!message || !appState.is_connected || appState.agent_loop_active) return;
  
  // Add user message to conversation first
  addMessage('user', message);
  
  // Clear input
  elements.messageInput.value = '';
  elements.messageInput.style.height = 'auto';
  handleMessageInputChange();
  
  // Start agent loop
  await startAgentLoop(message);
}

async function startAgentLoop(userMessage) {
  appState.agent_loop_active = true;
  updateAgentStatus('Thinking');
  showTypingIndicator();
  
  // Add user message to conversation history
  appState.conversation.push({
    role: 'user',
    content: userMessage
  });
  
  try {
    // Main agent loop
    while (true) {
      const { output, toolCalls } = await callLLM(appState.conversation, getAvailableTools());
      
      // Hide typing indicator before showing response
      hideTypingIndicator();
      
      if (output && output.trim()) {
        addMessage('agent', output);
      }
      
      if (toolCalls && toolCalls.length > 0) {
        // Execute tool calls
        for (const toolCall of toolCalls) {
          addToolCallMessage(toolCall);
          showTypingIndicator();
          const result = await handleToolCall(toolCall);
          hideTypingIndicator();
          addToolResultMessage(toolCall.name, result);
          
          // Add tool result to conversation
          appState.conversation.push({
            role: 'tool',
            tool_call_id: toolCall.id || Date.now().toString(),
            name: toolCall.name,
            content: JSON.stringify(result)
          });
        }
        
        // Continue the loop for further LLM processing
        showTypingIndicator();
      } else {
        // No more tool calls, exit loop
        break;
      }
    }
  } catch (error) {
    console.error('Agent loop error:', error);
    hideTypingIndicator();
    addMessage('agent', `❌ Sorry, I encountered an error: ${error.message}`);
    showAlert('Agent execution failed', 'error');
  } finally {
    appState.agent_loop_active = false;
    updateAgentStatus('Ready');
    hideTypingIndicator();
    handleMessageInputChange();
    scrollToBottom();
  }
}

// LLM Communication
async function callLLM(messages, tools) {
  const config = appState.llm_config;
  
  // Simulate LLM call (in real implementation, make actual API request)
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
  
  // Mock response based on last user message
  const lastUserMessage = messages.filter(m => m.role === 'user').pop();
  const mockResponse = generateMockLLMResponse(lastUserMessage?.content || '', tools);
  
  // Add assistant message to conversation
  if (mockResponse.output) {
    appState.conversation.push({
      role: 'assistant',
      content: mockResponse.output,
      tool_calls: mockResponse.toolCalls
    });
  }
  
  return mockResponse;
}

function generateMockLLMResponse(userMessage, tools) {
  const lowerMessage = userMessage.toLowerCase();
  
  // Detect if user wants search
  if (lowerMessage.includes('search') || lowerMessage.includes('find') || lowerMessage.includes('look up') || lowerMessage.includes('news')) {
    return {
      output: "I'll search for that information for you.",
      toolCalls: [{
        id: 'call_' + Date.now(),
        name: 'google_search',
        arguments: { query: extractSearchQuery(userMessage), num_results: 5 }
      }]
    };
  }
  
  // Detect if user wants code execution
  if (lowerMessage.includes('calculate') || lowerMessage.includes('code') || lowerMessage.includes('javascript') || lowerMessage.includes('factorial')) {
    return {
      output: "I'll execute some JavaScript code for you.",
      toolCalls: [{
        id: 'call_' + Date.now(),
        name: 'execute_javascript',
        arguments: { code: generateMockCode(userMessage) }
      }]
    };
  }
  
  // Detect if user wants API call
  if (lowerMessage.includes('api') || lowerMessage.includes('request') || lowerMessage.includes('fetch')) {
    return {
      output: "I'll make an API request for you.",
      toolCalls: [{
        id: 'call_' + Date.now(),
        name: 'ai_pipe_request',
        arguments: { endpoint: 'https://api.example.com/data', method: 'GET' }
      }]
    };
  }
  
  // Default response
  return {
    output: generateMockTextResponse(userMessage),
    toolCalls: null
  };
}

function extractSearchQuery(message) {
  // Extract search query from user message
  const searchTerms = message.replace(/search|find|look up|for/gi, '').trim();
  return searchTerms || 'AI developments 2025';
}

function generateMockCode(message) {
  if (message.toLowerCase().includes('factorial')) {
    return 'function factorial(n) { return n <= 1 ? 1 : n * factorial(n-1); } const result = factorial(10); console.log(`Factorial of 10: ${result}`); result;';
  }
  return 'console.log("Hello from JavaScript execution!"); const result = Math.random(); console.log(`Random number: ${result}`); result;';
}

function generateMockTextResponse(message) {
  const responses = [
    "I understand you're asking about this topic. Let me help you with that.",
    "That's an interesting question. Here's what I can tell you...",
    "I'd be happy to help you with that. Based on your question...",
    "Let me provide you with some information about this."
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}

// Tool Execution
function getAvailableTools() {
  const tools = [];
  
  if (appState.tool_config.google_search_enabled) {
    tools.push(APP_DATA.available_tools.find(t => t.name === 'google_search'));
  }
  
  if (appState.tool_config.ai_pipe_enabled) {
    tools.push(APP_DATA.available_tools.find(t => t.name === 'ai_pipe_request'));
  }
  
  if (appState.tool_config.js_execution_enabled) {
    tools.push(APP_DATA.available_tools.find(t => t.name === 'execute_javascript'));
  }
  
  return tools;
}

async function handleToolCall(toolCall) {
  switch (toolCall.name) {
    case 'google_search':
      return await executeGoogleSearch(toolCall.arguments);
    case 'ai_pipe_request':
      return await executeAiPipeRequest(toolCall.arguments);
    case 'execute_javascript':
      return await executeJavaScript(toolCall.arguments);
    default:
      throw new Error(`Unknown tool: ${toolCall.name}`);
  }
}

async function executeGoogleSearch(args) {
  // Simulate search delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Mock search results
  return {
    query: args.query,
    results: [
      {
        title: "AI Breakthrough in 2025",
        snippet: "Recent developments in AI technology show significant progress in reasoning capabilities and multi-modal understanding...",
        url: "https://example.com/ai-news-1"
      },
      {
        title: "New AI Research Findings",
        snippet: "Scientists have discovered new methods for improving AI performance and efficiency in language processing tasks...",
        url: "https://example.com/ai-research"
      },
      {
        title: "AI Industry Updates",
        snippet: "The latest trends and developments in the AI industry for 2025 including new LLM architectures and applications...",
        url: "https://example.com/ai-industry"
      }
    ],
    total_results: 3
  };
}

async function executeAiPipeRequest(args) {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Mock API response
  return {
    endpoint: args.endpoint,
    method: args.method || 'GET',
    status: 200,
    data: {
      message: "Mock API response data",
      timestamp: new Date().toISOString(),
      data: { 
        value: Math.random(),
        status: "success",
        items: ["item1", "item2", "item3"]
      }
    }
  };
}

async function executeJavaScript(args) {
  try {
    // Create sandboxed execution environment
    const output = [];
    
    // Capture console output
    const mockConsole = {
      log: (...messages) => {
        output.push(messages.join(' '));
      }
    };
    
    // Create safe execution context
    const safeContext = {
      console: mockConsole,
      Math: Math,
      Date: Date,
      JSON: JSON,
      Array: Array,
      Object: Object,
      String: String,
      Number: Number,
      Boolean: Boolean
    };
    
    // Execute code with limited scope
    const func = new Function(...Object.keys(safeContext), `
      "use strict";
      ${args.code}
    `);
    
    const result = func.apply(null, Object.values(safeContext));
    
    return {
      code: args.code,
      output: output,
      result: result,
      success: true
    };
    
  } catch (error) {
    return {
      code: args.code,
      error: error.message,
      success: false
    };
  }
}

// UI Management
function addMessage(sender, content) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${sender}`;
  
  const avatarDiv = document.createElement('div');
  avatarDiv.className = `message-avatar ${sender}-avatar`;
  avatarDiv.textContent = sender === 'user' ? '👤' : '🤖';
  
  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';
  
  const headerDiv = document.createElement('div');
  headerDiv.className = 'message-header';
  headerDiv.innerHTML = `
    <span class="message-sender">${sender === 'user' ? 'You' : 'Agent'}</span>
    <span class="message-time">${new Date().toLocaleTimeString()}</span>
  `;
  
  const textDiv = document.createElement('div');
  textDiv.className = 'message-text';
  textDiv.textContent = content;
  
  contentDiv.appendChild(headerDiv);
  contentDiv.appendChild(textDiv);
  messageDiv.appendChild(avatarDiv);
  messageDiv.appendChild(contentDiv);
  
  elements.chatMessages.appendChild(messageDiv);
  scrollToBottom();
}

function addToolCallMessage(toolCall) {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'tool-call-message';
  
  messageDiv.innerHTML = `
    <div class="tool-call-header">
      <span>🔧 Tool Call: ${toolCall.name}</span>
    </div>
    <div class="tool-call-details">
      <strong>Arguments:</strong>
      <pre>${JSON.stringify(toolCall.arguments, null, 2)}</pre>
    </div>
  `;
  
  elements.chatMessages.appendChild(messageDiv);
  scrollToBottom();
}

function addToolResultMessage(toolName, result) {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'tool-result-message';
  
  let resultContent = '';
  
  if (toolName === 'execute_javascript') {
    resultContent = `
      <div class="code-execution-result">
        <strong>Code:</strong><br>
        <code>${result.code}</code><br><br>
        <strong>Output:</strong><br>
        ${result.output && result.output.length > 0 ? result.output.join('<br>') : 'No output'}<br><br>
        <strong>Result:</strong> ${result.success ? result.result : result.error}
      </div>
    `;
  } else if (toolName === 'google_search') {
    resultContent = `
      <div><strong>Search Results for "${result.query}":</strong></div>
      ${result.results.map(r => `
        <div style="margin: 8px 0; padding: 8px; background: var(--color-secondary); border-radius: 4px;">
          <strong>${r.title}</strong><br>
          <small>${r.snippet}</small><br>
          <a href="${r.url}" target="_blank">${r.url}</a>
        </div>
      `).join('')}
    `;
  } else {
    resultContent = `<pre>${JSON.stringify(result, null, 2)}</pre>`;
  }
  
  messageDiv.innerHTML = `
    <div class="tool-result-header">
      <span>✅ Tool Result: ${toolName}</span>
    </div>
    ${resultContent}
  `;
  
  elements.chatMessages.appendChild(messageDiv);
  scrollToBottom();
}

function showTypingIndicator() {
  elements.typingIndicator.classList.remove('hidden');
  scrollToBottom();
}

function hideTypingIndicator() {
  elements.typingIndicator.classList.add('hidden');
}

function scrollToBottom() {
  setTimeout(() => {
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
  }, 100);
}

function clearConversation() {
  if (appState.agent_loop_active) {
    showAlert('Cannot clear chat while agent is active', 'warning');
    return;
  }
  
  if (confirm('Are you sure you want to clear the conversation?')) {
    elements.chatMessages.innerHTML = `
      <div class="welcome-message">
        <div class="message-avatar agent-avatar">🤖</div>
        <div class="message-content">
          <div class="message-header">
            <span class="message-sender">Agent</span>
            <span class="message-time">System</span>
          </div>
          <div class="message-text">
            Hello! I'm your AI agent with access to web search, API calls, and JavaScript execution. 
            Configure your LLM provider and ask me anything!
          </div>
        </div>
      </div>
    `;
    appState.conversation = [];
    showAlert('Conversation cleared', 'info');
  }
}

function updateConnectionStatus(connected) {
  const statusEl = elements.connectionStatus.querySelector('.status-indicator');
  const textEl = elements.connectionStatus.querySelector('.status-text');
  
  if (connected) {
    statusEl.classList.remove('offline');
    statusEl.classList.add('online');
    textEl.textContent = `Connected to ${appState.llm_config.provider || 'LLM'}`;
  } else {
    statusEl.classList.remove('online');
    statusEl.classList.add('offline');
    textEl.textContent = 'Not connected';
  }
  
  appState.is_connected = connected;
}

function updateAgentStatus(status) {
  const stateEl = elements.agentStatus.querySelector('.agent-state');
  stateEl.textContent = status;
  stateEl.className = `agent-state ${status.toLowerCase().replace(' ', '-')}`;
  appState.agent_state = status;
}

// Modal Management
function showModal(modalType) {
  const modalId = modalType === 'provider' ? 'providerModal' : 'toolModal';
  const modal = elements[modalId];
  if (modal) {
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }
}

function hideModal(modalType) {
  const modalId = modalType === 'provider' ? 'providerModal' : 'toolModal';
  const modal = elements[modalId];
  if (modal) {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
  }
}

// Alert System
function showAlert(message, type = 'info', title = null) {
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert ${type}`;
  
  alertDiv.innerHTML = `
    <div class="alert-header">
      ${title ? `<div class="alert-title">${title}</div>` : ''}
      <button class="alert-close">✕</button>
    </div>
    <div class="alert-message">${message}</div>
  `;
  
  const closeBtn = alertDiv.querySelector('.alert-close');
  closeBtn.addEventListener('click', () => {
    alertDiv.remove();
  });
  
  elements.alertContainer.appendChild(alertDiv);
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (alertDiv.parentNode) {
      alertDiv.remove();
    }
  }, 5000);
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  // Clear sensitive data but keep non-sensitive config
  if (appState.llm_config.api_key) {
    appState.llm_config.api_key = '';
  }
});
