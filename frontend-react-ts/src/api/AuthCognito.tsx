import type { CognitoTokens } from '../types/loginTypes';

const AUTH_URL = `https://${import.meta.env.VITE_USER_POOL_DOMAIN}.auth.${import.meta.env.VITE_AWS_REGION}.amazoncognito.com/oauth2/token`;

export const authService = {

    async extractJWT(code: string): Promise<CognitoTokens> {
        const body = new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: import.meta.env.VITE_CLIENT_ID,
            code,
            redirect_uri: import.meta.env.VITE_REDIRECT_URI
        });

        const response = await fetch(AUTH_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body.toString()
        });

        if (!response.ok) throw new Error('Auth Code Exchange Failed');
        return response.json();
    },

    // Save tokens to session storage- done externally
    storeTokens(tokens: Partial<CognitoTokens>) {
        console.log(tokens.access_token)
        console.log(tokens.id_token)
        if (tokens.access_token) sessionStorage.setItem("access_key", tokens.access_token);
        if (tokens.refresh_token) sessionStorage.setItem("refresh_key", tokens.refresh_token);
        if (tokens.id_token) sessionStorage.setItem("id_key", tokens.id_token);
        if (tokens.expires_in) sessionStorage.setItem("expiresAt", (Date.now() + (tokens.expires_in * 1000)).toString());
    },


    async renewJWT(refresh_token: string): Promise<CognitoTokens | null> {
        const body = new URLSearchParams({
            grant_type: 'refresh_token',
            client_id: import.meta.env.VITE_CLIENT_ID,
            refresh_token,
        });

        const response = await fetch(AUTH_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body.toString()
        });

        if (!response.ok) {
            this.handleSignOut();
            return null;
        }
        return response.json();
    },

    handleSignOut() {

        sessionStorage.clear();

        const region = import.meta.env.VITE_AWS_REGION
        const domainName = import.meta.env.VITE_USER_POOL_DOMAIN
        const clientId = import.meta.env.VITE_CLIENT_ID
        const logoutUri = import.meta.env.VITE_LOGOUT_URI

        const domain = `${domainName}.auth.${region}.amazoncognito.com`
        const cognitoLogoutUrl = `https://${domain}/logout?client_id=${clientId}&logout_uri=${encodeURIComponent(logoutUri)}`;
        window.location.href = cognitoLogoutUrl;
    },

    handleSignIn() {

        const region = import.meta.env.VITE_AWS_REGION
        const domainName = import.meta.env.VITE_USER_POOL_DOMAIN
        const clientId = import.meta.env.VITE_CLIENT_ID
        const redirectUri = import.meta.env.VITE_REDIRECT_URI


        const loginUrl = `https://${domainName}.auth.${region}.amazoncognito.com/login?client_id=${clientId}&response_type=code&scope=email+openid+profile&redirect_uri=${redirectUri}`
        window.location.href = loginUrl;
    }

};