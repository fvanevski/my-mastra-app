import { CopilotRuntime, OpenAIAdapter } from '@copilotkit/backend';
import { NextRequest } from 'next/server';

const openaiAdapter = new OpenAIAdapter();

export async function POST(req: NextRequest) {
  const runtime = new CopilotRuntime({
    actions: [
      {
        name: "search_knowledge_base",
        description: "Search the knowledge base for relevant information",
        parameters: [
          {
            name: "query",
            type: "string",
            description: "The search query",
            required: true,
          },
          {
            name: "maxResults", 
            type: "number",
            description: "Maximum number of results to return",
            required: false,
          }
        ],
        handler: async ({ query, maxResults = 5 }: { query: string; maxResults?: number }) => {
          try {
            const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/rag-search`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ query, maxResults }),
            });
            
            const result = await response.json();
            return result.result || 'No results found';
          } catch (error) {
            console.error('Error searching knowledge base:', error);
            return 'Error searching knowledge base';
          }
        },
      },
      {
        name: "add_document",
        description: "Add a document to the knowledge base",
        parameters: [
          {
            name: "text",
            type: "string", 
            description: "The document text to add",
            required: true,
          },
          {
            name: "metadata",
            type: "object",
            description: "Optional metadata for the document",
            required: false,
          }
        ],
        handler: async ({ text, metadata = {} }: { text: string; metadata?: any }) => {
          try {
            const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/add-document`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ text, metadata }),
            });
            
            const result = await response.json();
            return result.message || 'Document added successfully';
          } catch (error) {
            console.error('Error adding document:', error);
            return 'Error adding document to knowledge base';
          }
        },
      }
    ],
  });

  return runtime.response(req, openaiAdapter);
}
