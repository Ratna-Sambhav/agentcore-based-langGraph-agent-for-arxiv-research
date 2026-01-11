import { authService } from "../api/AuthCognito";
import './Login.css';

function Login() {
    return (
        <div className="login-container">
            <div className="login-card">
                <h1 className="login-title">Sign In</h1>
                <button onClick={authService.handleSignIn} className="login-button">
                    Login with Cognito
                </button>
            </div>
        </div>
    );
}

export default Login;