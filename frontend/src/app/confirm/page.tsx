"use client";

import { use, useEffect } from "react"
import { useSearchParams, useRouter } from 'next/navigation';
import style from "./style.module.css"
import { useAuthGuard } from "../../../hooks/useAuthGuard";



const url = process.env.NEXT_PUBLIC_BACKEND_URL


export default function confirm(){

    const params = useSearchParams();

    const router = useRouter()


    const confirm_user = (confirm_token) =>{
        fetch(`${url}/verify_user`,{
            method: "POST",
            headers:{
                "Content-Type": "application/json"
            },
            body: JSON.stringify({"token": confirm_token})
        })
        .then(res =>{
            if(!res.ok){
                router.push("/login")
            }
            res.json
        })
        .then(data =>{
        })
    }



    useEffect(()=>{
        const token = params.get("token");
        if(token){
            confirm_user(token)
            localStorage.removeItem("token")
            router.push("/login")
        }else{
            router.push("/verify")
        }
    },[])

    const isVerified = useAuthGuard("vendor");

    if (isVerified === null || isVerified === false) return null;



    return(
        <>
        <div className={style.container}>
        <img src="/logowhite.png"></img>
        </div>
        </>
    )
}