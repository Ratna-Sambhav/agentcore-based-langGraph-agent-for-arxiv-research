import { UpdateItemCommand, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { GetDynamoClient } from "./clients";
import type { ServiceCredentials } from "../types/loginTypes";
import { authService } from "../api/AuthCognito";

export const DynamoService = {
    // APPEND an item to the list
    async addItemToList(value: string, params: ServiceCredentials, user_identity: string) {
        const client = GetDynamoClient(params);
        try {
            await client.send(new UpdateItemCommand({
                TableName: 'agentic-congito-based-access',
                Key: { userId: { S: user_identity } },

                UpdateExpression: "SET #d = list_append(if_not_exists(#d, :empty_list), :new_item)",
                ExpressionAttributeNames: { "#d": "data" },
                ExpressionAttributeValues: {
                    ":new_item": { L: [{ S: value }] },
                    ":empty_list": { L: [] }
                }
            }));
            console.log("Item added to list!");
        } catch (error) {
            console.error("Error appending to list:", error);
            authService.handleSignOut()
        }
    },

    // DELETE an item by sessionId (fetch, filter, replace approach)
    async removeItemBySessionId(sessionId: string, params: ServiceCredentials, user_identity: string) {
        const client = GetDynamoClient(params);
        try {
            // First, fetch the current list
            const currentList = await this.dynamoGet(params, user_identity);

            // Filter out the session with matching sessionId
            const updatedList = currentList.filter(item => {
                try {
                    const parsed = JSON.parse(item);
                    return parsed.sessionId !== sessionId;
                } catch (error) {
                    // Keep items that can't be parsed (shouldn't happen, but safe fallback)
                    return true;
                }
            });

            // Replace the entire list with the filtered version
            const dynamoList = updatedList.map(item => ({ S: item }));

            await client.send(new UpdateItemCommand({
                TableName: 'agentic-congito-based-access',
                Key: { userId: { S: user_identity } },
                UpdateExpression: "SET #d = :newList",
                ExpressionAttributeNames: { "#d": "data" },
                ExpressionAttributeValues: {
                    ":newList": { L: dynamoList }
                }
            }));

            console.log(`Removed session with ID: ${sessionId}`);
        } catch (error) {
            console.error("Error removing item by sessionId:", error);
            authService.handleSignOut()
        }
    },

    async dynamoGet(params: ServiceCredentials, user_identity: string): Promise<string[]> {
        const client = GetDynamoClient(params);
        try {
            const response = await client.send(new GetItemCommand({
                TableName: 'agentic-congito-based-access',
                Key: { userId: { S: user_identity } }
            }));

            // Map the DynamoDB List (L) back to a standard Javascript Array
            const list = response.Item?.data?.L || [];
            const mapList = list.map(item => item.S || "");
            return mapList;
        } catch (error) {
            console.error("Error getting list:", error);
            authService.handleSignOut()
            return [];
        }
    }
};