import { createTool } from '@mastra/core/tools';
import { MDocument, createVectorQueryTool } from '@mastra/rag';
import { LibSQLVector } from '@mastra/libsql';
import { google } from '@ai-sdk/google';
import { embedMany } from 'ai';
import { z } from 'zod';

// Initialize vector store (using LibSQL as default)
const vectorStore = new LibSQLVector({
  connectionUrl: process.env.DATABASE_URL || ':memory:', // Use in-memory DB for demo
});

// Initialize embedding model
const embeddingModel = google.embedding('text-embedding-004');

// Tool for adding documents to the knowledge base
export const addDocumentTool = createTool({
  id: 'add-document',
  description: 'Add a document to the knowledge base with chunking and embedding',
  inputSchema: z.object({
    text: z.string().describe('The document text to add'),
    metadata: z.record(z.any()).optional().describe('Optional metadata for the document'),
    chunkSize: z.number().optional().default(512).describe('Size of text chunks'),
    chunkOverlap: z.number().optional().default(50).describe('Overlap between chunks')
  }),
  outputSchema: z.object({
    documentId: z.string(),
    chunksCreated: z.number(),
    embedded: z.boolean(),
    message: z.string()
  }),
  execute: async (params) => {
    const { context, ...other } = params;
    const { text, metadata = {}, chunkSize = 512, chunkOverlap = 50 } = context;
    try {
      // Create MDocument instance using fromText static method
      const document = MDocument.fromText(text, {
        ...metadata,
        addedAt: new Date().toISOString(),
        id: `doc-${Date.now()}`
      });

      // Chunk the document directly using the .chunk() method
      const chunks = await document.chunk({
        strategy: 'recursive',
        size: chunkSize,
        overlap: chunkOverlap,
        separator: '\n\n'
      });

      // Get the document metadata for the ID
      const docMetadata = document.getMetadata();
      const documentId = docMetadata[0]?.id || `doc-${Date.now()}`;
      
      // Ensure vector index exists
      const indexName = 'knowledge-base';
      try {
        await vectorStore.createIndex({
          indexName,
          dimension: 768, // text-embedding-004 dimension
          metric: 'cosine'
        });
      } catch (error) {
        // Index might already exist, continue
        console.log('Index already exists or creation failed:', error);
      }

      // Extract text content from chunks and prepare for embedding
      const chunkTexts = chunks.map(chunk => chunk.text);
      const chunkMetadata = chunks.map((chunk, index) => ({
        ...chunk.metadata,
        text: chunk.text,
        documentId,
        chunkIndex: index,
        addedAt: new Date().toISOString()
      }));

      // Generate embeddings for all chunks
      const embeddings = await embedMany({
        model: embeddingModel,
        values: chunkTexts
      });

      // Store vectors in the vector store
      await vectorStore.upsert({
        indexName,
        vectors: embeddings.embeddings,
        metadata: chunkMetadata,
        ids: chunks.map((_, index) => `${documentId}-chunk-${index}`)
      });

      return {
        documentId,
        chunksCreated: chunks.length,
        embedded: true,
        message: `Successfully processed document into ${chunks.length} chunks and stored embeddings in vector database.`
      };
    } catch (error) {
      console.error('Error processing document:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        documentId: 'error',
        chunksCreated: 0,
        embedded: false,
        message: `Error processing document: ${errorMessage}`
      };
    }
  }
});

// Vector search tool for retrieving relevant documents
export const vectorSearchTool = createVectorQueryTool({
  id: 'vector-search',
  description: 'Search the knowledge base using semantic vector search',
  vectorStoreName: 'vectorize',
  indexName: 'knowledge-base', 
  model: google.embedding('text-embedding-004'),
  enableFilter: true,
  includeSources: true,
  includeVectors: false
});

// Advanced RAG search tool that combines vector search with context processing
export const ragSearchTool = createTool({
  id: 'rag-search-advanced',
  description: 'Advanced RAG search with context processing and relevance ranking',
  inputSchema: z.object({
    query: z.string().describe('The user query to search for'),
    maxResults: z.number().optional().default(5).describe('Maximum number of results'),
    minScore: z.number().optional().default(0.7).describe('Minimum relevance score'),
    filter: z.record(z.any()).optional().describe('Metadata filters to apply')
  }),
  outputSchema: z.object({
    relevantContext: z.string(),
    sources: z.array(z.object({
      id: z.string(),
      content: z.string(), 
      score: z.number(),
      metadata: z.record(z.any())
    })),
    totalFound: z.number(),
    searchPerformed: z.boolean()
  }),
  execute: async (params) => {
    const { context } = params;
    const { query, maxResults = 5, minScore = 0.7, filter } = context;
    try {
      const indexName = 'knowledge-base';
      
      // Generate embedding for the query
      const queryEmbedding = await embedMany({
        model: embeddingModel,
        values: [query]
      });

      // Perform vector search
      const vectorResults = await vectorStore.query({
        indexName,
        queryVector: queryEmbedding.embeddings[0],
        topK: maxResults,
        filter,
        includeVector: false,
        minScore
      });

      // Transform results to match expected format
      const sources = vectorResults.map(result => ({
        id: result.id,
        content: (result.metadata?.text as string) || 'No content available',
        score: result.score,
        metadata: result.metadata || {}
      }));

      // Combine relevant context
      const relevantContext = sources
        .map(source => `[Source: ${source.metadata.documentId || 'unknown'}]\n${source.content}`)
        .join('\n\n---\n\n');

      return {
        relevantContext,
        sources,
        totalFound: vectorResults.length,
        searchPerformed: true
      };
      
    } catch (error) {
      console.error('RAG search error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      // Fallback to mock data if vector search fails
      const mockResults = [
        {
          id: 'fallback-1',
          content: `Based on the query "${query}", here is fallback information. The vector search encountered an error: ${errorMessage}`,
          score: 0.5,
          metadata: {
            documentId: 'fallback',
            source: 'error-fallback',
            error: true
          }
        }
      ];

      return {
        relevantContext: mockResults[0].content,
        sources: mockResults,
        totalFound: 1,
        searchPerformed: false
      };
    }
  }
});
