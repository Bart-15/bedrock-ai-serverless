/* eslint-disable @typescript-eslint/no-explicit-any */
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Handler } from 'aws-lambda';

export type ProxyHandler = Handler<
  APIGatewayProxyEventV2 & { requestContext: { authorizer: any } },
  APIGatewayProxyResultV2
>;

export type Event = APIGatewayProxyEventV2 & { requestContext: { authorizer: any } };
