"use client";

import styles from "./page.module.css"
import Nav from "../../../componets/Nav/Nav"

import { useAuthGuard } from "../../../hooks/useAuthGuard";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { jwtDecode } from "jwt-decode";

import QRCode from "qrcode";

export default function Dashboard(){

  const isVerified = useAuthGuard("vendor");
  const router = useRouter();
  const [src, setSrc] = useState<string>("")
  const [shopId, setShopId] = useState<string>("")
  


const generate = () => {
  const token = localStorage.getItem("token")
  if (!token) return;
  const decoded = jwtDecode(token);
  const user_id = decoded.sub;
  if (typeof user_id === "string") {
    setShopId(user_id);
    QRCode.toDataURL(`${process.env.NEXT_PUBLIC_DOMAIN}/shop/${user_id}`).then(setSrc);
  }
}


const get_menu = () => {
    fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/vendor/menu`,{
      method: "GET",
      headers: {
        "Authorization": `Bearer ${localStorage.getItem("token")}`,
        "Content-Type": "application/json",
      },
    })
    .then(res =>{
      return res.json()
    })
    .then(data =>{

    })
  }

  useEffect(()=>{
    generate()
    get_menu()

  }, [])




  if (isVerified === null || isVerified === false) return null;



    return (
        <>
        <div className={styles.container}>
            <Nav/>
             <img src={src && src}></img>
            <h1>Welcome To SkipDish!</h1>
            <div className={styles.button_section}>
                <button onClick={()=> router.push("/dashboard/orders")} className={styles.button}>View Orders</button>
                <button onClick={()=> router.push("/dashboard/menu")} className={styles.button}>Manage Menu</button>
                <button onClick={()=> router.push(`/shop/${shopId}`)} className={styles.button}>View Shop</button>
            </div>

        </div>
        </>
    )
}