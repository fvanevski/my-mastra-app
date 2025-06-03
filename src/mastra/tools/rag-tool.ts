// import { createVectorQueryTool } from '@mastra/rag';
// import { google } from '@ai-sdk/google';

// // Create a vector query tool using Google's embedding model
// export const vectorQueryTool = createVectorQueryTool({
//   id: 'vector-search',
//   description: 'Search the knowledge base using semantic vector search to find relevant documents',
//   vectorStoreName: 'vectorize', // Using Mastra's built-in vectorize
//   indexName: 'knowledge-base',
//   model: google.embedding('text-embedding-004'), // Google's latest embedding model
//   enableFilter: true, // Enable metadata filtering
//   includeSources: true, // Include source documents in results
//   includeVectors: false // Don't include raw vectors in output
// });
