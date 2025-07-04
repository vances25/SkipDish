"use client";

import styles from "./page.module.css"
import Nav from "../../../componets/Nav/Nav"

import { useAuthGuard } from "../../../hooks/useAuthGuard";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { jwtDecode } from "jwt-decode";

import QRCode from "qrcode";
import confetti from 'canvas-confetti';
import { tree } from "next/dist/build/templates/app-page";
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL

export default function Dashboard(){

  const isVerified = useAuthGuard("vendor");
  const router = useRouter();
  const [src, setSrc] = useState<string>("")
  const [shopId, setShopId] = useState<string>("")
  const [showQRModal, setShowQRModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);

  const [testMode, setTestMode] = useState<boolean>(true)
  const [showStripePopup, setShowStripePopup] = useState<boolean>(false);

  const [loaded, setLoaded] = useState<boolean>(false)

  const [stripeURL, setStripeURL] = useState<string>("")

  const [email, setEmail] = useState<string>("");

  const [accountSetting, setAccountSetting] = useState<"email" | "password" | null>(null);

  const [newEmail, setNewEmail] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

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


  const change_mode = async () => {

      let token = localStorage.getItem("token")

        const res = await fetch(`${BACKEND_URL}/change_mode`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.ok) {
          const data = await res.json();
          setTestMode(!testMode)
          confetti({
                particleCount: 60,
                spread: 70,
                origin: { y: 0.6 }
              });
          return data.mode;
        }else{
          tryCheck()
        }

        return false;
      };


    const tryCheck = async () => {

      let token = localStorage.getItem("token")

        const res = await fetch(`${BACKEND_URL}/check-verify-status`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.ok) {
          const data = await res.json();
          if(data.detail === "connect"){
            setShowStripePopup(true);
            setTestMode(true);
            setStripeURL(data.url)
            console.log("tes")
            return false;
          }
          console.log(data.test_mode)
          setTestMode(data.test_mode)
          setLoaded(true)
          return true;
        }

        return false;
      };

  const handleAccountUpdate = async () => {
    const token = localStorage.getItem("token");
    let body: any = {
      change_type: accountSetting,
      value: accountSetting === "email" ? newEmail : newPassword,
    };
    if (accountSetting === "password") {
      body.old_password = oldPassword;
    }

    const res = await fetch(`${BACKEND_URL}/update_account`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const result = await res.json();
    if (res.ok) {
      alert("Account updated!");
      setShowAccountModal(false);
      window.location.reload()
    } else {
      alert(result.detail || "Error updating account");
    }
  };


  // Add handleRestartOnboarding function
  const handleRestartOnboarding = async () => {
    const token = localStorage.getItem("token");
    const res = await fetch(`${BACKEND_URL}/vendor/restart_onboarding`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.ok) {
      const data = await res.json();
      window.location.href = data.url;
    } else {
      alert("Failed to restart Stripe onboarding.");
    }
  };

  useEffect(() => {
    generate();
    tryCheck();

    const token = localStorage.getItem("token");
    if (token) {
      fetch(`${BACKEND_URL}/account`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data?.email) {
            setEmail(data.email);
          }
        });
    }
    console.log(testMode)
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

                 <div onClick={()=> change_mode()} className={styles.section}>
                  <img src={testMode ?  "/icons/test.png": "/icons/live.png"} />
                    <h1>{testMode ?  "Test Mode": "Live Mode"}</h1>
                    <p>Click To Switch Mode</p>
                </div>

                 <div onClick={() => setShowQRModal(true)} className={styles.section}>
                  <img src="/qrcode.png" />
                    <h1>QR Code</h1>
                    <p>Share Your Shop QR Code</p>
                </div>

                 <div onClick={() => setShowAccountModal(true)} className={styles.section}>
                    <img src="/icons/avatar.png" />
                    <h2>Account Settings</h2>
                    <p>Change your account settings here</p>
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
        {showStripePopup && (
          <div className={styles.popupOverlay} onClick={() => setShowStripePopup(false)}>
            <div className={styles.popupContent} onClick={(e) => e.stopPropagation()}>
              <h2>Stripe Verification Required</h2>
              <p>You need to connect with Stripe before switching modes.</p>
              <a href={stripeURL} target="_blank" rel="noopener noreferrer" className={styles.stripeButton}>
                Go to Stripe
              </a>
              <button onClick={() => setShowStripePopup(false)} className={styles.closeButton}>Close</button>
            </div>
          </div>
        )}
        {showAccountModal && (
          <div className={styles.modalOverlay} onClick={() => setShowAccountModal(false)}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <h2>Account Settings</h2>
              <label htmlFor="currentEmail">Current Email</label>
              <input id="currentEmail" type="text" value={email} disabled className={styles.inputField} />

              <div className={styles.buttonGroup}>
                <button className={styles.saveButton} onClick={() => setAccountSetting("email")}>Change Email</button>
                <button className={styles.saveButton} onClick={() => setAccountSetting("password")}>Change Password</button>
              </div>

              {accountSetting === "email" && (
                <>
                  <label htmlFor="newEmail">New Email</label>
                  <input
                    id="newEmail"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="Enter new email"
                    className={styles.inputField}
                  />
                </>
              )}

              {accountSetting === "password" && (
                <>
                  <label htmlFor="oldPassword">Old Password</label>
                  <input
                    id="oldPassword"
                    type="password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="Enter old password"
                    className={styles.inputField}
                  />
                  <label htmlFor="newPassword">New Password</label>
                  <input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className={styles.inputField}
                  />
                </>
              )}

              <button className={styles.saveButton} onClick={handleAccountUpdate}>Save</button>
              <button onClick={() => setShowAccountModal(false)} className={styles.closeButton}>Close</button>
              
              <button className={styles.saveButton} onClick={handleRestartOnboarding}>
                Restart Stripe Onboarding
              </button>
            </div>
          </div>
        )}
        </>
    )
}