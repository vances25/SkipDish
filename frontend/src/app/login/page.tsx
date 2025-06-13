"use client";

import styles from "./page.module.css";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";



const url = process.env.NEXT_PUBLIC_BACKEND_URL

export default function Login() {
  const router = useRouter();

  const [email, setEmail] = useState<String>("")
  const [password, setPassword] = useState<String>("")

  const [response, setResponse] = useState<String | null>(null)

  const [ready, setReady] = useState<boolean>(true)

  useEffect(() => {
  const checkSession = async () => {
    console.log("Running session check...");
    const token = localStorage.getItem("token");
    if (!token) return;

    // Try access token first
    const res = await fetch(`${url}/check-verify-status`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.ok) {
      const data = await res.json();
      if (data.detail === "good") router.push("/dashboard");
    } else if (res.status === 401 || res.status === 403) {
      // Token might be expired, try to refresh
      const refreshRes = await fetch(`${url}/refresh`, {
        method: "POST",
        credentials: "include",
      });
      console.log("Refresh call response:", refreshRes);

      if (refreshRes.ok) {
        const data = await refreshRes.json();
        localStorage.setItem("token", data.access_token);
        router.push("/dashboard");
      }
    }
  };

  checkSession();
}, []);




  const make_request = () => {

    setTimeout(()=>{
      setReady(true)
    },3000)

    if (ready){
      setReady(false)
      fetch(`${url}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
        credentials: "include"  // if you're using refresh token in cookies
      })
        .then(async res => {
          const data = await res.json();

          if (res.ok) {
            localStorage.setItem("token", data?.access_token);
            setResponse("Login successful!");

          
            router.push("/verify");

          } else {
            setResponse(data.detail || "Login failed");
          }
        })
        .catch(e => {
          console.error(e);
          setResponse("Something went wrong.");
        });
    }
};


  return (
    <div className={styles.container}>
      <img
        onClick={() => router.push("/")}
        src="/logowhite.png"
        alt="Logo"
      />
      <h1>Login</h1>

      <div className={styles.input_box}>
        <input onChange={(e)=>setEmail(e.target.value)} value={email} type="email" placeholder="Email address" />
        <input onChange={(e)=>setPassword(e.target.value)} value={password} type="password" placeholder="Password" />
        <button onClick={()=> make_request()}>Login</button>
        <p>{response}</p>
      </div>
    </div>
  );
}