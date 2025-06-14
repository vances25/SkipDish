// page.tsx
"use client";

import { useEffect, useState } from "react";
import styles from "./page.module.css";
import { useRouter } from "next/navigation";

import { useParams } from "next/navigation";

interface MenuItem {
  id: string;
  name: string;
  price: string;
  description: string;
}

export default function Shop() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [shopName, setShopName] = useState<string>("");
  const [brandImage, setBrandImage] = useState<string>("https://placehold.co/600x400/png");
  const [cart, setCart] = useState<MenuItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const { brandId } = useParams();
  



  const router = useRouter()

  useEffect(() => {
    const storedCart = localStorage.getItem("cart");
    if (storedCart) setCart(JSON.parse(storedCart));
    get_menu();
  }, []);

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
    localStorage.setItem("cart", JSON.stringify(updatedCart));
  };


  const removeFromCart = (index: number) => {
    const updatedCart = [...cart];
    updatedCart.splice(index, 1);
    setCart(updatedCart);
    localStorage.setItem("cart", JSON.stringify(updatedCart));
};

  return (
    <div className={styles.container}>
      <img className={styles.back_home} src="/logowords.png" alt="Back Home" />

      <div className={styles.header}>
        <h1 className={styles.shopName}>{shopName}</h1>
      </div>

            <button className={styles.cartToggle} onClick={() => setShowCart(true)}>
        🛒 View Cart ({cart.length})
        </button>

      <div className={styles.menuList}>
        {menuItems.length === 0 ? (
          <p style={{ textAlign: "center", color: "#666" }}>No items available.</p>
        ) : (
          menuItems.map(item => (
            <div key={item.id} className={styles.menuCard}>
              <div className={styles.menuInfo}>
                <h2>{item.name}</h2>
                <p className={styles.description}>{item.description}</p>
                <p className={styles.price}>${item.price}</p>
              </div>
              <div className={styles.menuActions}>
                <button className={styles.orderButton} onClick={() => addToCart(item)}>Add to Cart</button>
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
            )}

            <button onClick={() => setShowCart(false)} style={{ marginTop: "1rem" }}>
                Close
            </button>
            </div>
        </div>
        )}
        <button
              onClick={() => router.push(`/checkout/${brandId}`)}
              className={styles.checkout}
            >
              Checkout
            </button>
    </div>
);
}
