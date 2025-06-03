import { Agent } from '@mastra/core';
import { google } from '@ai-sdk/google';
import { MDocument } from '@mastra/rag';
import { embedMany } from 'ai'; // embedMany is still used in initializeSampleData
import {
  addDocumentTool,
  ragSearchTool,
  vectorStore, // Imported from rag-tools (LibSQLVector instance)
  embeddingModel // Imported from rag-tools (GoogleGenerativeAIEmbeddingModel)
} from '../tools/rag-tools';

export const ragAgent = new Agent({
  name: 'RAG Agent',
  description: 'A RAG assistant that helps users find information from a knowledge base and can add new documents.',
  instructions: `You are a helpful RAG (Retrieval-Augmented Generation) assistant.
  Your primary goal is to provide users with accurate information based on a knowledge base.

  Key Capabilities:
  - Search Knowledge Base: Use the 'ragSearchTool' to find relevant documents and answer user questions.
    Base your answers *strictly* on the information retrieved. If no relevant information is found,
    clearly state that.
  - Add Documents: If a user provides a new document or text, use the 'addDocumentTool'
    to add it to the knowledge base. Inform the user upon successful addition.

  Interaction Guidelines:
  - When asked a question, first use 'ragSearchTool'.
  - When given a document to add, use 'addDocumentTool'.
  - Cite sources or document IDs if available and relevant from the search results.
  - If the context from 'ragSearchTool' is insufficient, indicate what's missing.
  - Be concise but thorough.
  - You cannot add documents from URLs, only from provided text.
  - If you are unsure how to proceed, ask for clarification.`,
  
  model: google('gemini-1.5-flash'),
  
  tools: {
    addDocumentTool,
    ragSearchTool
  }
});

// Sample documents for testing
const sampleDocuments = [
  { text: `Mastra is a TypeScript-first framework for building AI agents, workflows, and integrations.
   It provides a unified interface for working with different AI models, vector databases, and external APIs.
   Key features include type-safe agents, workflow orchestration, and built-in RAG capabilities.`,
   metadata: { source: 'mastra-overview.md', category: 'framework', id: 'doc-sample-1' }
  },
  { text: `RAG (Retrieval-Augmented Generation) in Mastra allows you to enhance LLM outputs by incorporating
   relevant context from your own data sources. The system supports multiple vector stores including 
   PostgreSQL with pgvector, Pinecone, Qdrant, and others. You can chunk documents using various 
   strategies and generate embeddings with different models.`,
   metadata: { source: 'rag-guide.md', category: 'rag', id: 'doc-sample-2' }
  },
  { text: `CopilotKit is a React framework for building AI-powered applications. It provides components
   like CopilotChat for conversational interfaces and hooks for integrating AI capabilities into 
   React applications. AG-UI serves as a bridge between Mastra agents and CopilotKit frontends.`,
   metadata: { source: 'copilotkit-integration.md', category: 'frontend', id: 'doc-sample-3' }
  },
  { text: `AG-UI is Mastra's protocol for connecting AI agents to frontend applications. It enables
   seamless integration between Mastra agents and UI frameworks like CopilotKit. AG-UI handles 
   the communication between agents and frontends, allowing for real-time chat interfaces and 
   AI-powered user interactions.`,
   metadata: { source: 'agui-protocol.md', category: 'integration', id: 'doc-sample-4' }
  }
];

// Initialize sample data
export async function initializeSampleData() {
  console.log('Initializing sample data using new RAG tools...');
  const indexName = 'knowledge-base'; // As defined in rag-tools.ts

  try {
    // Ensure vector index exists (similar to addDocumentTool)
    await vectorStore.createIndex({
      indexName,
      dimension: 768, // text-embedding-004 dimension, ensure this matches embeddingModel
      metric: 'cosine'
    });
    console.log(`Index "${indexName}" checked/created.`);
  } catch (error) {
    // Index might already exist, log and continue
    console.log(`Index "${indexName}" already exists or creation failed (safe to ignore if already exists):`, error);
  }

  for (const sampleDoc of sampleDocuments) {
    try {
      console.log(`Processing sample document: ${sampleDoc.metadata.source}`);
      const document = MDocument.fromText(sampleDoc.text, {
        ...sampleDoc.metadata,
        addedAt: new Date().toISOString(),
        // id is already in sampleDoc.metadata
      });

      const chunks = await document.chunk({
        strategy: 'recursive',
        size: 512, // Default from addDocumentTool
        overlap: 50, // Default from addDocumentTool
        separator: '\n\n'
      });

      const chunkTexts = chunks.map(chunk => chunk.text);
      const documentId = document.getMetadata()[0]?.id || `doc-${Date.now()}`;

      const chunkMetadata = chunks.map((chunk, index) => ({
        ...chunk.metadata, // existing metadata from MDocument chunking
        text: chunk.text, // Store full text in metadata for retrieval
        documentId,
        chunkIndex: index,
        addedAt: new Date().toISOString()
      }));

      const embeddings = await embedMany({
        model: embeddingModel, // Use imported embeddingModel
        values: chunkTexts
      });

      await vectorStore.upsert({
        indexName,
        vectors: embeddings.embeddings,
        metadata: chunkMetadata,
        ids: chunks.map((_, index) => `${documentId}-chunk-${index}`)
      });
      console.log(`Successfully processed and stored: ${sampleDoc.metadata.source} (${chunks.length} chunks)`);
    } catch (error) {
      console.error(`Error processing sample document ${sampleDoc.metadata.source}:`, error);
    }
  }
  console.log('Sample data initialization process completed.');
}
