'use client';

import React from 'react';
import { 
  CopilotSidebar, 
  CopilotChat
} from '@copilotkit/react-ui';
// useCopilotAction is removed as the actions are now handled by the Mastra agent
import { CopilotKit } from '@copilotkit/react-core';

export function ChatInterface() {
  // The useCopilotAction hooks for 'search_knowledge_base' and 'add_document'
  // have been removed. These actions will now be handled by the Mastra agent
  // through the AG-UI endpoint configured in the CopilotKit provider.

  return (
    <div className="h-screen w-full">
      <CopilotSidebar>
        <div className="p-4">
          <h2 className="text-lg font-semibold mb-4">RAG AI Assistant</h2>
          <p className="text-sm text-gray-600 mb-4">
            Ask questions about your documents or add new documents to the knowledge base.
          </p>
          
          <div className="space-y-2 text-xs text-gray-500">
            <p>• Ask questions about your documents</p>
            <p>• Add documents with: "Add this document: [text]"</p>
            <p>• Search specific topics</p>
          </div>
        </div>
        
        <CopilotChat
          labels={{
            title: "RAG Assistant",
            initial: "Hello! I can help you search through your documents and add new ones to the knowledge base. What would you like to do?",
          }}
          className="h-full"
        />
      </CopilotSidebar>
    </div>
  );
}
