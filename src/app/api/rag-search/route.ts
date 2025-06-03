import { NextRequest, NextResponse } from 'next/server';
import { mastra } from '@/mastra';

export async function POST(req: NextRequest) {
  try {
    const { query, maxResults = 5 } = await req.json();
    
    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    // Get the RAG agent from Mastra
    const ragAgent = mastra.getAgent('ragAgent');
    
    if (!ragAgent) {
      return NextResponse.json({ error: 'RAG agent not found' }, { status: 500 });
    }

    // Use the agent to perform RAG search
    const result = await ragAgent.generate([
      {
        role: 'user',
        content: `Use the ragSearchTool to find information relevant to the following query: "${query}". Please return up to ${maxResults} results.`
      }
    ]);

    return NextResponse.json({
      success: true,
      result: result.text,
      query,
      maxResults
    });

  } catch (error) {
    console.error('Error in RAG search:', error);
    return NextResponse.json(
      { error: 'Failed to search knowledge base' },
      { status: 500 }
    );
  }
}
