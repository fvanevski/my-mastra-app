
import { Mastra } from '@mastra/core';
import { ragAgent } from './agents/rag-agent';

export const mastra = new Mastra({
  agents: {
    ragAgent
  }
});
        