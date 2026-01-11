import { authService } from "./AuthCognito";
// import { idPoolService } from "./IdPoolCognito";
import type { CognitoTokens, RenewedCognitoTokens } from "../types/loginTypes";


export const Auth = {

    async ProcessCode(code: string) {
        const Tokens: CognitoTokens = await authService.extractJWT(code);
        authService.storeTokens(Tokens);
    },

    async handleRenew() {
        const RefreshedTokens: RenewedCognitoTokens | null = await authService.renewJWT(sessionStorage.getItem("refresh_key")!);
        if (RefreshedTokens) authService.storeTokens(RefreshedTokens);
        authService.handleSignOut();
    },

    async CheckExpiry() {
        const expiresAt = sessionStorage.getItem("expiresAt");

        // Check if token is still valid
        if (expiresAt) {
            const expirationTime = parseInt(expiresAt, 10);
            const isExpired = Date.now() >= expirationTime;

            if (isExpired) {
                // Token expired, need to refresh
                await this.handleRenew();
            }
        }
    },
}