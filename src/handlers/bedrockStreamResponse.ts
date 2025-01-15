import {
  BedrockRuntimeClient,
  InvokeModelWithResponseStreamCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { APIGatewayProxyEventV2 } from 'aws-lambda';

import { streamifyResponse, ResponseStream } from 'lambda-stream';

export const handler = streamifyResponse(streamHandler);

async function streamHandler(event: APIGatewayProxyEventV2, responseStream: ResponseStream) {
  const client = new BedrockRuntimeClient({
    region: 'us-east-1',
  });

  const requestBody = JSON.parse(event.body as string);

  const prompt = requestBody.prompt;
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

  try {
    const response = await client.send(command);

    const chunks: string[] = [];

    const metadata = {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Transfer-Encoding': 'chunked',
        Connection: 'keep-alive',
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    };

    // @ts-ignore: Ignore streamifyResponse type error
    responseStream = awslambda.HttpResponseStream.from(responseStream, metadata);

    for await (const chunk of response.body as AsyncGenerator<any>) {
      const parsed = JSON.parse(Buffer.from(chunk.chunk.bytes, 'base64').toString('utf-8'));
      chunks.push(parsed.completion);
      responseStream.write(parsed.completion);
    }

    console.log(chunks.join(''));
    responseStream.end();
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error:', error);

      const metaData = {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      };
      // @ts-ignore: Ignore streamifyResponse type error
      responseStream = awslambda.HttpResponseStream.from(responseStream, metaData);

      responseStream.write(JSON.stringify({ error: error.message }));
      responseStream.end();
      return;
    }
  }
}
