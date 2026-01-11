// id-pool-cognito.tsx
import { GetIdCommand, GetCredentialsForIdentityCommand } from "@aws-sdk/client-cognito-identity";
import { Auth } from "./AuthContext";
import { CognitoClient } from "./clients";
import type { IdCommandInput } from "../types/loginTypes";
const provider_name = `cognito-idp.${import.meta.env.VITE_AWS_REGION}.amazonaws.com/${import.meta.env.VITE_USER_POOL_ID}`;

export const idPoolService = {

    async GetId(id_key: string) {
        const client = CognitoClient;
        Auth.CheckExpiry();

        // Getting ID
        try {
            const input: IdCommandInput = {
                IdentityPoolId: import.meta.env.VITE_IDENTITY_POOL_ID,
                Logins: {
                    [provider_name]: id_key,
                },
            };

            let command = new GetIdCommand(input);
            let response = await client.send(command);
            const identityId = response.IdentityId;
            return identityId
        }
        catch (error) {
            console.log(error)
            return null
        }
    },

    async GetCredentials(id_key: string, identityId: string) {
        const client = CognitoClient;

        // Getting Credentials
        try {
            const input = {
                IdentityId: identityId,
                Logins: {
                    [provider_name]: id_key,
                },
            };
            const command = new GetCredentialsForIdentityCommand(input);
            const response = await client.send(command);

            if (!response.Credentials) return null;
            if (!response.Credentials.AccessKeyId) return null;
            if (!response.Credentials.SecretKey) return null;
            if (!response.Credentials.SessionToken) return null;
            return {
                accessKeyId: response.Credentials.AccessKeyId,
                secretAccessKey: response.Credentials.SecretKey,
                sessionToken: response.Credentials.SessionToken
            }

        } catch (error) {
            console.log(error)
            return null
        }
    }

}