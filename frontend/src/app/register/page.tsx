"use client";

import styles from "./page.module.css";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";


const url = process.env.NEXT_PUBLIC_BACKEND_URL


export default function Register() {

  const [email, setEmail] = useState<string>("")
  const [password, setPassword] = useState<string>("")
  const [confirmPassword, setConfirmPassword] = useState<string>("")

  const [response, setResponse] = useState<string | null>(null)

  const [ready, setReady] = useState<boolean>(true)

  const make_request = () => {

  setTimeout(()=>{
      setReady(true)
    },3000)


    if (password === confirmPassword){
      if (ready){
        fetch(`${url}/register`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            credentials: "include"
          },
          body: JSON.stringify({ email, password })
        })
          .then(async res => {
            const data = await res.json();

            if (res.ok) {
              setResponse("Account created!");
              localStorage.setItem("token", data?.access_token);

              if (data.redirect) {
                router.push(data.redirect);
              } else {
                router.push("/verify");
              }
            } else {
              setResponse(data.detail || "Registration failed");
            }
          })
          .catch(e => {
            console.error(e);
            setResponse("Something went wrong.");
          });
      }
    }else{
      setResponse("passwords are not matching")
    }
};


  const router = useRouter();

  return (
    <div className={styles.container}>
      <img
        onClick={() => router.push("/")}
        src="/logowhite.png"
        alt="Logo"
      />
      <h1>Create Account</h1>

      <div className={styles.input_box}>
        <input onChange={(e)=>setEmail(e.target.value)} value={email} type="email" placeholder="Email address" />
        <input onChange={(e)=>setPassword(e.target.value)} value={password} type="password" placeholder="Password" />
        <input onChange={(e)=>setConfirmPassword(e.target.value)} value={confirmPassword} type="password" placeholder="Confirm Password" />
        <button onClick={()=> make_request()}>Get Started</button>
        <p>{response}</p>

      </div>
    </div>
  );
}