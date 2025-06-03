import { NextRequest, NextResponse } from 'next/server';
import { mastra } from '@/mastra'; // Assuming this exports your initialized Mastra instance

// IMPORTANT NOTE: The import below is HYPOTHETICAL as per subtask instructions.
// The actual module for creating an HTTP handler for a Mastra agent might be different.
// Common places could be '@mastra/server', '@mastra/agui-http', or part of '@mastra/core'.
// This needs to be verified with actual Mastra documentation.
import { createHttpHandler } from '@mastra/core/server';

// Get the specific agent you want to serve
const agent = mastra.getAgent('ragAgent');

if (!agent) {
  // This error will be caught by Next.js and result in a 500 error page during build or runtime.
  // It's good practice to ensure agents are available.
  throw new Error("ragAgent not found. Ensure it's correctly initialized in Mastra.");
}

// Create a handler for the agent using the HYPOTHETICAL function.
// The actual Mastra API for this might be different (e.g., new MastraServer(agent).handler).
const handler = createHttpHandler(agent);

// Export the Next.js request handlers.
// AG-UI typically uses POST for sending commands/messages to the agent.
export async function POST(req: NextRequest) {
  // The handler function is expected to process the NextRequest and return a NextResponse.
  return handler(req);
}

// AG-UI might also use GET for other purposes (e.g., health checks, schema discovery, capabilities).
// Adding a GET handler as a placeholder, its actual implementation depends on AG-UI specs
// and how the `handler` from Mastra is supposed to work with different methods.
export async function GET(req: NextRequest) {
  // This is a fictional check. The actual handler might have its own way to handle GET
  // or might not support GET at all for the main endpoint.
  // @ts-ignore - handleGet is fictional
  if (handler.handleGet) {
    // @ts-ignore - handleGet is fictional
    return handler.handleGet(req);
  }
  // If the handler doesn't specifically support GET, or if GET is not for this path,
  // return Method Not Allowed or handle as per AG-UI specification.
  return new NextResponse('Method Not Allowed or GET not supported by this handler', { status: 405 });
}

// You might need to add other HTTP methods (PUT, DELETE, OPTIONS, etc.) if required by AG-UI
// or the specific Mastra HTTP handler implementation.
// For example, an OPTIONS request is common for CORS preflight checks.
export async function OPTIONS() {
  // Basic OPTIONS handler for CORS, actual headers would depend on your CORS policy
  const response = new NextResponse(null, { status: 204 });
  response.headers.set('Allow', 'GET, POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  // Add Access-Control-Allow-Origin if needed, though this is often handled by Next.js config or middleware
  return response;
}
