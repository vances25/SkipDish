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
  const [showQRModal, setShowQRModal] = useState(false);
  


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
            <h1 className={styles.welcome}>Welcome To SkipDish!</h1>
            <div className={styles.button_section}>
                <div onClick={()=> router.push("/dashboard/orders")} className={styles.section}>
                  <img src="/icons/bell.png" />
                    <h1>Orders</h1>
                    <p>View and manage all orders</p>
                  </div>

                <div onClick={()=> router.push("/dashboard/menu")} className={styles.section}>
                  <img src="/icons/burger_icon.png" />
                    <h1>Manage Menu</h1>
                    <p>Edit Food Items</p>
                </div>

                 <div onClick={()=> router.push(`/shop/${shopId}`)} className={styles.section}>
                  <img src="/icons/house.png" />
                    <h1>View Shop</h1>
                    <p>See What Customers See</p>
                </div>

                 <div onClick={()=> router.push("/dashboard/menu")} className={styles.section}>
                  <img src="/icons/arrow.png" />
                    <h1>Analytics</h1>
                    <p>Track Revenue</p>
                </div>

                 <div onClick={() => setShowQRModal(true)} className={styles.section}>
                  <img src="/qrcode.png" />
                    <h1>QR Code</h1>
                    <p>Share Your Shop QR Code</p>
                </div>

                 <div className={styles.section}>
                    <img src="/icons/dollar.png" />
                    <h2>Today's Revenue</h2>
                    <h1>$0</h1>
                </div>

              
            </div>

        </div>
        {showQRModal && (
          <div className={styles.modalOverlay} onClick={() => setShowQRModal(false)}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <img src={src} alt="QR Code" className={styles.qrImage} />
              <button onClick={() => setShowQRModal(false)} className={styles.closeButton}>Close</button>
            </div>
          </div>
        )}
        </>
    )
}