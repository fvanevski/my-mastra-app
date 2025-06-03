import { Agent } from '@mastra/core';
import { createTool } from '@mastra/core/tools';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { MDocument } from '@mastra/rag';
import { embedMany, embed } from 'ai';

// We'll use a simple in-memory store for now - you can replace with actual vector DB
interface VectorResult {
  id: string;
  score: number;
  metadata: Record<string, any>;
}

// Simple in-memory vector store for demonstration
class SimpleVectorStore {
  private documents: Array<{
    id: string;
    embedding: number[];
    metadata: Record<string, any>;
  }> = [];

  async addDocuments(texts: string[], embeddings: number[][], metadata: Record<string, any>[]) {
    for (let i = 0; i < texts.length; i++) {
      this.documents.push({
        id: `doc-${Date.now()}-${i}`,
        embedding: embeddings[i],
        metadata: {
          text: texts[i],
          ...metadata[i]
        }
      });
    }
  }

  async query(queryEmbedding: number[], topK: number = 5): Promise<VectorResult[]> {
    // Simple cosine similarity calculation
    const results = this.documents.map(doc => {
      const similarity = this.cosineSimilarity(queryEmbedding, doc.embedding);
      return {
        id: doc.id,
        score: similarity,
        metadata: doc.metadata
      };
    });

    // Sort by similarity and return top K
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .filter(result => result.score > 0.1); // Filter out very low similarity results
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, a_i, i) => sum + a_i * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, a_i) => sum + a_i * a_i, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, b_i) => sum + b_i * b_i, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }
}

// Initialize vector store and embedding model
const vectorStore = new SimpleVectorStore();
const embeddingModel = google.textEmbeddingModel('text-embedding-004', {
  outputDimensionality: 768
});

// Create the RAG search tool using createTool()
const ragSearchTool = createTool({
  id: 'rag-search',
  description: 'Search for relevant documents in the knowledge base to answer user questions',
  inputSchema: z.object({
    query: z.string().describe('The user query to search for relevant documents'),
    maxResults: z.number().optional().default(5).describe('Maximum number of results to retrieve')
  }),
  outputSchema: z.object({
    relevantContext: z.string().describe('The combined text from relevant document chunks'),
    sources: z.array(z.object({
      id: z.string(),
      content: z.string(),
      score: z.number(),
      metadata: z.record(z.any())
    })).describe('Array of source documents with metadata')
  }),
  execute: async ({ context: { query, maxResults = 5 } }) => {
    try {
      console.log(`Searching for: "${query}" with max results: ${maxResults}`);
      
      // Generate embedding for the query
      const { embedding: queryEmbedding } = await embed({
        model: embeddingModel,
        value: query
      });

      // Search for similar documents in the vector store
      const searchResults = await vectorStore.query(queryEmbedding, maxResults);

      // If no results found, return empty context
      if (!searchResults || searchResults.length === 0) {
        return {
          relevantContext: 'No relevant documents found for the given query.',
          sources: []
        };
      }

      // Transform results and extract content
      const sources = searchResults.map((result: VectorResult, index: number) => ({
        id: result.id || `result-${index}`,
        content: result.metadata?.text || 'No content available',
        score: result.score || 0,
        metadata: result.metadata || {}
      }));

      // Combine all relevant content into a single context string
      const relevantContext = sources
        .map((source: any) => source.content)
        .join('\n\n---\n\n');

      return {
        relevantContext,
        sources
      };

    } catch (error) {
      console.error('Error performing RAG search:', error);
      
      return {
        relevantContext: `Error occurred while searching the knowledge base: ${error instanceof Error ? error.message : 'Unknown error'}. Please try rephrasing your question.`,
        sources: []
      };
    }
  }
});

// Helper function to add documents to the knowledge base
export async function addDocumentsToKnowledgeBase(documents: string[], metadata?: Record<string, any>[]) {
  try {
    console.log(`Adding ${documents.length} documents to knowledge base...`);

    // Process each document
    const allChunks: string[] = [];
    const allMetadata: Record<string, any>[] = [];

    for (let i = 0; i < documents.length; i++) {
      const docText = documents[i];
      const docMetadata = metadata?.[i] || {};

      // Create document and chunk it
      const doc = MDocument.fromText(docText, docMetadata);
      const chunks = await doc.chunk({
        strategy: 'recursive',
        size: 512,
        overlap: 50
      });

      // Collect chunks and metadata
      chunks.forEach((chunk, idx) => {
        allChunks.push(chunk.text);
        allMetadata.push({
          text: chunk.text,
          source: docMetadata.source || `document-${i}`,
          chunk_index: idx,
          timestamp: new Date().toISOString(),
          ...chunk.metadata,
          ...docMetadata
        });
      });
    }

    // Generate embeddings for all chunks
    const { embeddings } = await embedMany({
      model: embeddingModel,
      values: allChunks
    });

    // Store in vector database
    await vectorStore.addDocuments(allChunks, embeddings, allMetadata);

    console.log(`Successfully added ${documents.length} documents (${allChunks.length} chunks) to knowledge base`);
  } catch (error) {
    console.error('Error adding documents to knowledge base:', error);
    throw error;
  }
}

export const ragAgent = new Agent({
  name: 'RAG Agent',
  description: 'A RAG assistant that helps users find information from a knowledge base',
  instructions: `You are a helpful RAG (Retrieval-Augmented Generation) assistant. 
  You help users find relevant information from a knowledge base and provide accurate, 
  contextual answers based on the retrieved documents.
  
  When responding:
  - Always use the rag-search tool to find relevant context before answering
  - Base your answers on the retrieved context from the tool
  - If you don't find relevant information, say so clearly
  - Provide citations or references to sources when possible
  - Be concise but thorough in your explanations
  - If the retrieved context doesn't fully answer the question, mention what information is missing`,
  
  model: google('gemini-1.5-flash'),
  
  tools: {
    ragSearch: ragSearchTool
  }
});

// Sample documents for testing
const sampleDocuments = [
  `Mastra is a TypeScript-first framework for building AI agents, workflows, and integrations. 
   It provides a unified interface for working with different AI models, vector databases, and external APIs.
   Key features include type-safe agents, workflow orchestration, and built-in RAG capabilities.`,
  
  `RAG (Retrieval-Augmented Generation) in Mastra allows you to enhance LLM outputs by incorporating 
   relevant context from your own data sources. The system supports multiple vector stores including 
   PostgreSQL with pgvector, Pinecone, Qdrant, and others. You can chunk documents using various 
   strategies and generate embeddings with different models.`,
   
  `CopilotKit is a React framework for building AI-powered applications. It provides components 
   like CopilotChat for conversational interfaces and hooks for integrating AI capabilities into 
   React applications. AG-UI serves as a bridge between Mastra agents and CopilotKit frontends.`,

  `AG-UI is Mastra's protocol for connecting AI agents to frontend applications. It enables 
   seamless integration between Mastra agents and UI frameworks like CopilotKit. AG-UI handles 
   the communication between agents and frontends, allowing for real-time chat interfaces and 
   AI-powered user interactions.`
];

// Initialize sample data
export async function initializeSampleData() {
  try {
    await addDocumentsToKnowledgeBase(sampleDocuments, [
      { source: 'mastra-overview.md', category: 'framework' },
      { source: 'rag-guide.md', category: 'rag' },
      { source: 'copilotkit-integration.md', category: 'frontend' },
      { source: 'agui-protocol.md', category: 'integration' }
    ]);
    console.log('Sample data initialized successfully');
  } catch (error) {
    console.error('Failed to initialize sample data:', error);
  }
}
