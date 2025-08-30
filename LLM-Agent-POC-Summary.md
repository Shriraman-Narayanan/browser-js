# LLM Agent POC - Technical Overview (200-300 words)

## Live Application
**Working Demo:** https://ppl-ai-code-interpreter-files.s3.amazonaws.com/web/direct-files/4f80a56173baca56c78c75a888a4af21/02648b9b-1df0-46f9-aadc-e15a8ce7d350/index.html

## Input Text Processing and Slide Mapping

The agent intelligently analyzes user input using a **continuous reasoning loop** converted from Python to JavaScript. The core logic processes messages through an LLM that can dynamically trigger tool calls based on context:

```javascript
async function agentLoop() {
  let messages = [userInput];
  while (true) {
    const { output, toolCalls } = await callLLM(messages, tools);
    displayAgentResponse(output);
    
    if (toolCalls) {
      const results = await Promise.all(toolCalls.map(handleToolCall));
      messages.push(...results);
    } else {
      messages.push(await getUserInput());
    }
  }
}
```

The LLM receives structured tool definitions and determines when to search the web, execute code, or make API calls. Input text is mapped to appropriate tools through **OpenAI-compatible function calling**, where the agent reasons about what information it needs and selects tools accordingly.

## Visual Style and Asset Application

The application uses a **modern Bootstrap-based design system** with comprehensive **alert management** for user feedback. Tool execution is visualized through real-time progress indicators, showing the agent's reasoning process.

**Tool Integration:**
- **Google Search API**: Web search with formatted snippet results using Custom Search JSON API
- **AI Pipe Proxy**: Backend-free API calls through aipipe.org service  
- **JavaScript Execution**: Secure sandboxed code execution with Function constructor isolation

**Security:** API keys stored locally only, sandboxed JavaScript execution prevents malicious code, input validation throughout.

The agent maintains conversation state, handles parallel tool execution, and provides graceful error recovery with user-friendly messaging. The interface is fully responsive with keyboard accessibility and real-time status updates.