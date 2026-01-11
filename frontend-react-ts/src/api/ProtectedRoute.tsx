import { Navigate } from 'react-router-dom';
import { authService } from "./AuthCognito";
import { jwtDecode } from "jwt-decode";
import { useEffect, useState } from "react";
import React from 'react';

interface ProtectedRouteProps {
    children: React.ReactNode;
}


function check_jwt_expiry() {
    console.log("Checking JWT Expiry")
    const id_key = sessionStorage.getItem("id_key")
    if (!id_key) {
        return true;
    }
    try {
        const decoded = jwtDecode(id_key)
        if (!decoded.exp) {
            return true;
        }
        return Date.now() > decoded.exp * 1000;
    } catch (error) {
        return true;
    }
}

async function renew_jwt_status() {
    console.log("JWT Expired Already.")
    console.log("Checking if it can be renewed.")
    const refresh_key = sessionStorage.getItem("refresh_key")
    if (!refresh_key) {
        return false;
    }
    const status = await authService.renewJWT(refresh_key)
    return status;
}

function ProtectedRoute({ children }: ProtectedRouteProps) {
    const [status, setStatus] = useState<"checking" | "authorized" | "unauthorized">("checking");


    useEffect(() => {
        async function validate() {
            if (!check_jwt_expiry()) {
                setStatus("authorized");
                return;
            } else {
                const refresh_status = await renew_jwt_status()
                if (refresh_status) {
                    setStatus("authorized");
                    return;
                }
            }
            setStatus("unauthorized");
        }
        validate()

    }, []);

    if (status === "unauthorized") {
        return <Navigate to="/login" />
    }
    if (status === "checking") {
        return (
            <div>
                <h1>Checking...</h1>
            </div>
        );
    }
    if (status === "authorized") {
        return children;
    }
}

export default ProtectedRoute;