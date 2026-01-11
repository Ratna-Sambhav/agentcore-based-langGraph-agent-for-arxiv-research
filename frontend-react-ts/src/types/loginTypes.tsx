// loginTypes.tsx

export interface ServiceCredentials {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken: string;
};

export interface IdPoolTokens {
    IdentityId: string;
    Credentials: ServiceCredentials;
}

export interface IdCommandInput {
    IdentityPoolId: string;
    Logins: Record<string, string>;
}

export interface CognitoTokens {
    access_token: string;
    expires_in: number;
    refresh_token: string;
    id_token: string;
    token_type: string;
}

export interface RenewedCognitoTokens {
    access_token: string;
    expires_in: number;
    id_token: string;
    token_type: string;
}

export interface UserSession {
    email: string;
    sub: string; // The unique ID from Cognito
    isAuthenticated: boolean;
}