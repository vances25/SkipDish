"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import styles from "./page.module.css";

interface MenuItem {
  id: string;
  name: string;
  price: string;
  description: string;
}

export default function CookieCheckoutPage() {
  const router = useRouter();
  const { brandId } = useParams();
  const [cart, setCart] = useState<MenuItem[]>([]);
  const [total, setTotal] = useState(0);
  const [validated, setValidated] = useState(false);
  const [customerName, setCustomerName] = useState("");

  useEffect(() => {
    const cookieCart = localStorage.getItem("cart");
    const parsedCart = cookieCart ? JSON.parse(cookieCart) : [];

    if (!parsedCart.length) {
      router.push(`/shop/${brandId}`);
      return;
    }

    const validateCart = (token: string) => {
      return fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/vendor/menu/${brandId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
    };

    const token = localStorage.getItem("token");

    validateCart(token!)
      .then(async (res) => {
        if (res.status === 401 || res.status === 403) {
          const refreshRes = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/refresh`, {
            method: "POST",
            credentials: "include",
          });

          if (refreshRes.ok) {
            const data = await refreshRes.json();
            localStorage.setItem("token", data.access_token);
            return validateCart(data.access_token);
          } else {
            localStorage.setItem("cart", JSON.stringify([]))
            router.push(`/shop/${brandId}`);
            return null;
          }
        }

        if (!res.ok) {
          localStorage.setItem("cart", JSON.stringify([]))
          router.push(`/shop/${brandId}`);
          return null;
        }

        return res.json();
      })
      .then((data) => {
        if (!data) return;
        if (!data.menu || !Array.isArray(data.menu)) {
          localStorage.setItem("cart", JSON.stringify([]));
          router.push(`/shop/${brandId}`);
          return;
        }

        const validIds = new Set(data.menu.map((item: MenuItem) => item.id));
        const validItems = parsedCart.filter((item: MenuItem) => validIds.has(item.id));

        if (validItems.length !== parsedCart.length) {
          localStorage.setItem("cart", JSON.stringify([]))
          router.push(`/shop/${brandId}`);
        } else {
          setCart(validItems);
          const totalPrice = validItems.reduce((sum: number, item: MenuItem) => sum + parseFloat(item.price), 0);
          setTotal(totalPrice);
          setValidated(true);
        }
      });
  }, [router, brandId]);

  const submitOrder = async () => {
    const token = localStorage.getItem("token");

    const order = {
      user_id: brandId,
      name: customerName,
      items: cart.map(item => ({
        id: item.id,
        name: item.name,
        price: String(parseFloat(item.price)),
      })),
      total_price: total,
    };

    const trySubmit = (tokenToUse: string) => {
      return fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/vendors/order/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenToUse}`,
        },
        credentials: "include",
        body: JSON.stringify(order),
      });
    };

    trySubmit(token!)
      .then(async (res) => {
        if (res.status === 403 || res.status === 401) {
          const refreshRes = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/refresh`, {
            method: "POST",
            credentials: "include",
          });

          if (refreshRes.ok) {
            const data = await refreshRes.json();
            localStorage.setItem("token", data.access_token);
            return trySubmit(data.access_token);
          } else {
            throw new Error("Token refresh failed");
          }
        }

        return res;
      })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to place order");
        return res.json();
      })
      .then(() => {
        alert("Order placed successfully!");
        localStorage.setItem("cart", JSON.stringify([]));
        router.push(`/shop/${brandId}`);
      })
      .catch((err) => {
        console.error("Error submitting order:", err);
        alert("Failed to place order.");
      });
  };

  if (!validated) return null;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Order Summary</h1>
      <div className={styles.itemList}>
        {cart.map((item, i) => (
          <div key={i} className={styles.item}>
            <span className={styles.name}>{item.name}</span>
            <span className={styles.price}>${item.price}</span>
          </div>
        ))}
      </div>
      <div className={styles.total}>Total: ${total.toFixed(2)}</div>
      <input
        type="text"
        placeholder="Enter your name"
        value={customerName}
        onChange={(e) => setCustomerName(e.target.value)}
        className={styles.input}
      />
        <button
        className={styles.button}
        onClick={submitOrder}
        disabled={!customerName.trim()}
        >
        Pay Now
        </button>
    </div>
  );
}