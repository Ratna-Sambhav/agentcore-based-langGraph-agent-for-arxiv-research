// awsClients file
import { CognitoIdentityClient } from "@aws-sdk/client-cognito-identity";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import type { ServiceCredentials } from "../types/loginTypes";

const region = import.meta.env.VITE_AWS_REGION
export const config = { region: region };
export const CognitoClient = new CognitoIdentityClient(config);

export function GetDynamoClient(credentials: ServiceCredentials) {
    return new DynamoDBClient({
        region,
        credentials
    });
}