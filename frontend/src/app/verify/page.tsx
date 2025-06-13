"use client";

import styles from "./page.module.css";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

import { jwtDecode } from "jwt-decode";


const url = process.env.NEXT_PUBLIC_BACKEND_URL;



export default function VerifyEmail() {


  
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  


  useEffect(() => {
    const token = localStorage.getItem("token");

    fetch(`${url}/check-verify-status`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      credentials: "include",
    })
      .then(async (res) => {
        if (!res.ok) {
          // Redirect if unauthorized or forbidden
          if (res.status === 401 || res.status === 403) {
            router.push("/login");
          } else {
            const errorData = await res.json();
            setMessage(errorData.detail || "Unknown error");
            setLoading(false);
          }
        } else {
          const data = await res.json();
          if (data.detail === "good") {
            router.push("/dashboard");
          } else {
            setMessage(data.detail);
            resendEmail();
            setLoading(false);
          }
        }
      })
      .catch((e) => {
        console.error("Fetch error:", e);
        setMessage("Failed to verify.");
        router.push("/login");
        setLoading(false);
      });
  }, [router]);


  const resendEmail = () => {

  const token = localStorage.getItem("token");

    if (!token) {
      setMessage("failed")
    return
    }

    const decoded: { email?: string } = jwtDecode(token || "");
    const email = decoded.email;
    if (!email) {
      setMessage("Email not found in token.");
      return;
    }
    console.log("User email:", email);

    fetch(`${url}/send_email`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      credentials: "include",
      body: JSON.stringify({"to_email": email})
    })
      .then(res => res.json())
      .then(data => setMessage(data.detail || "Verification email resent."))
      .catch(() => setMessage("Something went wrong."));
  };

  if (loading) {
    return (
      <>
        <div className={styles.container_load}>
        <img src="/logowhite.png"></img>
        </div>
        </>
    );
  }

  return (
    <div className={styles.container}>
      <img
        onClick={() => router.push("/")}
        src="/logowhite.png"
        alt="Logo"
      />
      <h1>Verify Your Email</h1>

      <div className={styles.input_box}>
        <p>Please check your inbox for a link to verify your email.</p>
        <button onClick={resendEmail}>Resend Email</button>
            <div style={{ color: "white", textAlign: "center", padding: "2rem" }}>
          {message && <p>{message}</p>}
        </div>
      </div>
    </div>
  );
}