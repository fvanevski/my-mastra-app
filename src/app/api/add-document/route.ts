import { NextRequest, NextResponse } from 'next/server';
import { mastra } from '@/mastra';

export async function POST(req: NextRequest) {
  try {
    const { text, metadata = {} } = await req.json();
    
    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    // Get the RAG agent from Mastra
    const ragAgent = mastra.getAgent('ragAgent');
    
    if (!ragAgent) {
      return NextResponse.json({ error: 'RAG agent not found' }, { status: 500 });
    }

    // Use the agent to add the document
    const result = await ragAgent.generate([
      {
        role: 'user',
        content: `Use the addDocumentTool to process and add the following document to the knowledge base. Document text: "${text}". Associated metadata: ${JSON.stringify(metadata)}.`
      }
    ]);

    return NextResponse.json({
      success: true,
      message: result.text,
      text,
      metadata
    });

  } catch (error) {
    console.error('Error adding document:', error);
    return NextResponse.json(
      { error: 'Failed to add document to knowledge base' },
      { status: 500 }
    );
  }
}
