import {
  BedrockRuntimeClient,
  InvokeModelWithResponseStreamCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { Readable, Writable } from 'stream';

// @ts-ignore: Ignore streamifyResponse type error
export const handler = awslambda.streamifyResponse(
  async (requestStream: Readable, responseStream: Writable, context: any) => {
    const client = new BedrockRuntimeClient({
      region: 'us-east-1',
    });

    const prompt = 'How to use useState in React.js?';
    const claudePrompt = `\n\nHuman:${prompt}\n\nAssistant:`;

    const body = {
      prompt: claudePrompt,
      max_tokens_to_sample: 2048,
      temperature: 0.5,
      top_k: 250,
      top_p: 0.5,
      stop_sequences: [],
    };

    const params = {
      modelId: 'anthropic.claude-v2',
      stream: true,
      contentType: 'application/json',
      accept: '*/*',
      body: JSON.stringify(body),
    };

    const command = new InvokeModelWithResponseStreamCommand(params);

    const response = await client.send(command);

    const chunks: string[] = [];

    for await (const chunk of response.body as AsyncGenerator<any>) {
      const parsed = JSON.parse(Buffer.from(chunk.chunk.bytes, 'base64').toString('utf-8'));
      chunks.push(parsed.completion);
      responseStream.write(parsed.completion);
    }

    console.log(chunks.join(''));
    responseStream.end();
  }
);
