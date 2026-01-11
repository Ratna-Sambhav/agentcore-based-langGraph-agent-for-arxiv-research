import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Auth } from "../api/AuthContext";

function Callback() {
    const navigate = useNavigate();
    const hasRun = useRef(false);

    useEffect(() => {
        // Prevent running twice in development mode (React StrictMode)
        if (hasRun.current) return;
        hasRun.current = true;

        const handleCallback = async () => {
            const params = new URLSearchParams(window.location.search);
            const code = params.get("code");
            console.log(`Code: ${code}`)

            if (!code) {
                navigate("/login");
                return;
            }

            try {
                await Auth.ProcessCode(code);
                const from = sessionStorage.getItem("from") || "/";
                navigate(from);
            } catch (err) {
                console.error("Authentication error:", err);
                navigate("/login");
            }
        };

        handleCallback();
    }, [navigate]);

    return (
        <h1>Please wait, We are trying to sign you in....</h1>
    );
}

export default Callback;