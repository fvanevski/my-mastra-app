'use client';

import { CopilotKit } from '@copilotkit/react-core';
import { ChatInterface } from '@/components/chat-interface';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">
      <CopilotKit runtimeUrl="/api/copilotkit">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              RAG AI Assistant
            </h1>
            <p className="text-gray-600 mb-8">
              Ask questions about your knowledge base or add new documents to expand it.
            </p>
            
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <ChatInterface />
            </div>
          </div>
        </div>
      </CopilotKit>
    </main>
  );
}
