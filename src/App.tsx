import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Bot, User, ChevronDown } from 'lucide-react';

interface Message {
  role: 'assistant' | 'user';
  content: string;
}

interface StreamResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
}

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentModel, setCurrentModel] = useState('llama2');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [streamingMessage, setStreamingMessage] = useState('');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingMessage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);
    setStreamingMessage('');

    try {
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: currentModel,
          prompt: userMessage,
        }),
      });

      const reader = response.body?.getReader();
      if (!reader) return;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n');

        lines.forEach(line => {
          if (line.trim()) {
            const data: StreamResponse = JSON.parse(line);
            setStreamingMessage(prev => prev + data.response);
            
            if (data.done) {
              setMessages(prev => [...prev, { role: 'assistant', content: prev + data.response }]);
              setStreamingMessage('');
            }
          }
        });
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bot className="w-6 h-6 text-blue-600" />
            <h1 className="text-xl font-semibold text-gray-900">Ollama Chat</h1>
          </div>
          <div className="flex items-center space-x-2">
            <select
              value={currentModel}
              onChange={(e) => setCurrentModel(e.target.value)}
              className="block w-40 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="llama2">Llama 2</option>
              <option value="codellama">Code Llama</option>
              <option value="mistral">Mistral</option>
            </select>
          </div>
        </div>
      </header>

      {/* Chat Container */}
      <div className="flex-1 max-w-5xl w-full mx-auto p-4 overflow-y-auto">
        <div className="space-y-6">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex items-start space-x-3 ${
                message.role === 'assistant' ? 'justify-start' : 'justify-end'
              }`}
            >
              {message.role === 'assistant' && (
                <div className="flex-shrink-0">
                  <Bot className="w-8 h-8 text-blue-600" />
                </div>
              )}
              <div
                className={`rounded-lg px-4 py-2 max-w-3xl ${
                  message.role === 'assistant'
                    ? 'bg-white shadow-sm'
                    : 'bg-blue-600 text-white'
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
              {message.role === 'user' && (
                <div className="flex-shrink-0">
                  <User className="w-8 h-8 text-blue-600" />
                </div>
              )}
            </div>
          ))}
          {streamingMessage && (
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <Bot className="w-8 h-8 text-blue-600" />
              </div>
              <div className="rounded-lg px-4 py-2 max-w-3xl bg-white shadow-sm">
                <p className="whitespace-pre-wrap">{streamingMessage}</p>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Form */}
      <div className="border-t bg-white">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <form onSubmit={handleSubmit} className="flex space-x-4">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default App;