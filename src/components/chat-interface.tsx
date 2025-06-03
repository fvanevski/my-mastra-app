'use client';

import React from 'react';
import { 
  CopilotSidebar, 
  CopilotChat
} from '@copilotkit/react-ui';
import { CopilotKit, useCopilotAction } from '@copilotkit/react-core';

export function ChatInterface() {
  // Register the RAG search action with CopilotKit
  useCopilotAction({
    name: 'search_knowledge_base',
    description: 'Search the knowledge base for relevant information',
    parameters: [
      {
        name: 'query',
        type: 'string',
        description: 'The search query',
        required: true,
      },
      {
        name: 'maxResults',
        type: 'number',
        description: 'Maximum number of results to return',
        required: false,
      }
    ],
    handler: async ({ query, maxResults = 5 }: { query: string; maxResults?: number }) => {
      try {
        // This will be handled by our Mastra agent via AG-UI
        const response = await fetch('/api/rag-search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query, maxResults }),
        });
        
        const result = await response.json();
        return result.relevantContext || 'No relevant information found.';
      } catch (error) {
        console.error('Error searching knowledge base:', error);
        return 'Error occurred while searching the knowledge base.';
      }
    },
  });

  // Register the add document action
  useCopilotAction({
    name: 'add_document',
    description: 'Add a document to the knowledge base',
    parameters: [
      {
        name: 'text',
        type: 'string',
        description: 'The document text to add',
        required: true,
      },
      {
        name: 'metadata',
        type: 'object',
        description: 'Optional metadata for the document',
        required: false,
      }
    ],
    handler: async ({ text, metadata = {} }: { text: string; metadata?: Record<string, any> }) => {
      try {
        const response = await fetch('/api/add-document', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text, metadata }),
        });
        
        const result = await response.json();
        return result.message || 'Document added successfully.';
      } catch (error) {
        console.error('Error adding document:', error);
        return 'Error occurred while adding document to knowledge base.';
      }
    },
  });

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
