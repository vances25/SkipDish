// page.tsx
"use client";

import { useEffect, useState } from "react";
import styles from "./page.module.css";
import { useRouter } from "next/navigation";

import { useParams } from "next/navigation";

import confetti from 'canvas-confetti';


interface MenuItem {
  id: string;
  name: string;
  price: string;
  description: string;
}

export default function Shop() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [shopName, setShopName] = useState<string>("");
  const [cart, setCart] = useState<MenuItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const { brandId } = useParams();
  const [showToast, setShowToast] = useState<boolean>(false)

  const cartKey = `cart-${brandId}`;

  const router = useRouter()

  const url = process.env.NEXT_PUBLIC_BACKEND_URL

  useEffect(() => {
    const storedCart = localStorage.getItem(cartKey);
    if (storedCart) setCart(JSON.parse(storedCart));
    get_menu();
  }, []);


  const stripe_checkout = async () => {
    const totalInCents = Math.round(cart.reduce((sum, item) => sum + parseFloat(item.price), 0) * 100);

    try {
      const response = await fetch(`${url}/create-checkout-session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
        vendor_id: brandId,
        amount_cents: totalInCents,
        items: cart.map(item => ({
          name: item.name,
          price: parseFloat(item.price),
        })),
      }),
    });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
        localStorage.removeItem(cartKey);
      } else {
        alert("Failed to start checkout session.");
      }
    } catch (error) {
      console.error("Stripe checkout error:", error);
      alert("An error occurred during checkout.");
    }
  };


  const get_menu = () => {
    fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/vendor/menu/${brandId}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${localStorage.getItem("token")}`,
        "Content-Type": "application/json",
      },
    })
      .then(async res => {
        if (res.status === 403 || res.status === 401) {
          const refreshRes = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/refresh`, {
            method: "POST",
            credentials: "include",
          });

          if (refreshRes.ok) {
            const data = await refreshRes.json();
            localStorage.setItem("token", data.access_token);
            return get_menu();
          } else {
            console.error("Token refresh failed");
            return;
          }
        }

        if (!res.ok) {
          console.error("Failed to fetch menu");
          return;
        }

        return res.json();
      })
      .then(data => {
        if (!data) return;
        setMenuItems(data.menu);
        setShopName(data.shop_name);
      })
      .catch(err => console.error("Failed to load menu:", err));
  };

  const addToCart = (item: MenuItem) => {
    const updatedCart = [...cart, item];
    setCart(updatedCart);
    localStorage.setItem(cartKey, JSON.stringify(updatedCart));
    setShowToast(true);
    confetti({
      particleCount: 60,
      spread: 70,
      origin: { y: 0.6 }
    });
    setTimeout(() => setShowToast(false), 1500);
    
  };


  const removeFromCart = (index: number) => {
    const updatedCart = [...cart];
    updatedCart.splice(index, 1);
    setCart(updatedCart);
    localStorage.setItem(cartKey, JSON.stringify(updatedCart));
};

  return (
    <div className={styles.container}>
     <div onClick={()=> router.push("/dashboard")} className={styles.back_home}>Home</div>
      <div className={styles.header}>
        <h1 className={styles.shopName}>{shopName}</h1>
      </div>

      <div className={styles.menuList}>
        {menuItems.length === 0 ? (
          <p style={{ textAlign: "center", color: "#666" }}>No items available.</p>
        ) : (
          menuItems.map(item => (
            <div key={item.id} className={styles.menuCard}>

               <div className={styles.icons_shit}>
                  <div className={styles.menuInfo}>
                    <div className={styles.top_section}>
                      <h2>{item.name}</h2>
                      <p className={styles.price}>${item.price}</p>
                    </div>
                    <p className={styles.description}>{item.description}</p>
                    <br/>
                    <div className={styles.menuActions}>
                      <button className={`${styles.orderButton}`} onClick={() => addToCart(item)}>Add to Cart</button>
                  </div>
                  </div>

              </div>

            </div>
          ))
        )}
      </div>

      {showCart && (
        <div className={styles.cartModal}>
            <div className={styles.cartContent}>
            <h2>Your Cart</h2>

            {cart.length === 0 ? (
                <p style={{ marginTop: "1rem", textAlign: "center", color: "#666" }}>
                Your cart is empty.
                </p>
            ) : (
              <>
                <ul>
                {cart.map((item, i) => (
                    <li key={i} className={styles.cartItem}>
                    <span title={item.name}>
                        ${item.price} - {item.name.length > 40 ? item.name.slice(0, 40) + "..." : item.name}
                    </span>
                    <button className={styles.removeBtn} onClick={() => removeFromCart(i)}>✕</button>
                    </li>
                ))}                
                </ul>

            <button
              onClick={() => stripe_checkout()}
              className={styles.checkout}
            >
              Checkout
            </button>
                </>
                
            )}
            <br/>

            <button onClick={() => setShowCart(false)} style={{ marginTop: "1rem" }}>
                Close
            </button>
            </div>
        </div>
        )}
        <div className={styles.cartToggle} onClick={() => setShowCart(true)}>
          <img src="/icons/cart.png" />
        <p className={showToast ? styles.cartCountBump : ""}>View Cart ({cart.length})</p>
        </div>
        {showToast && (
  <div className={styles.toast}>Added to cart!</div>
)}
    </div>
);
}
