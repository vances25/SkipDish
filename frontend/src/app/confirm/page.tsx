"use client";

import React from "react";
import { useEffect } from "react";
import { useSearchParams, useRouter } from 'next/navigation';
import style from "./style.module.css";
import { useAuthGuard } from "../../../hooks/useAuthGuard";

const url = process.env.NEXT_PUBLIC_BACKEND_URL;

function ConfirmComponent() {
    const params = useSearchParams();
    const router = useRouter();

    const confirm_user = (confirm_token: string) => {
        fetch(`${url}/verify_user`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ "token": confirm_token })
        })
            .then(res => {
                if (!res.ok) {
                    router.push("/login");
                }
                return res.json();
            })
            .then(data => {});
    };

    useEffect(() => {
        const token = params.get("token");
        if (token) {
            confirm_user(token);
            localStorage.removeItem("token");
            router.push("/login");
        } else {
            router.push("/verify");
        }
    }, []);

    const isVerified = useAuthGuard("vendor");
    if (isVerified === null || isVerified === false) return null;

    return (
        <div className={style.container}>
            <img src="/logowhite.png" />
        </div>
    );
}

export default function ConfirmPage() {
    return (
        <React.Suspense fallback={<div>Loading...</div>}>
            <ConfirmComponent />
        </React.Suspense>
    );
}