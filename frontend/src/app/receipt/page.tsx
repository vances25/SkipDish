"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import styles from "./style.module.css";

export default function OrderSuccess() {
  const searchParams = useSearchParams();
  const order_id = searchParams.get("order_id");

  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!order_id) return;

    fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/one_time_receipt/${order_id}`)
      .then(res => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then(data => {
        console.log("Receipt Data:", data);
        setSession(data);
      })
      .catch(() => {
        setSession(null);
      })
      .finally(() => setLoading(false));
  }, [order_id]);

  if (loading) return <div className={styles.loading}>Loading your order...</div>;
  if (!session) return <div className={styles.error}>Order not found.</div>;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>🎉 Order Confirmed!<br/>#{session.order_id}</h1>
      <p className={styles.sub}>Thanks, {session.customer_name}!</p>
      <p className={styles.notice}>This is your receipt. Please do not close this tab.</p>
      <p className={styles.meta}><strong>Order ID:</strong> {session.order_id}</p>
      <p className={styles.meta}><strong>Date:</strong> {new Date(session.created_at * 1000).toLocaleString()}</p>

      <div className={styles.summary}>
        <h2 className={styles.sectionTitle}>Order Summary</h2>
        <ul className={styles.itemList}>
          {Array.isArray(session.items) && session.items.length > 0 ? (
            session.items.map((item: any, i: number) => (
              <li key={i} className={styles.item}>
                <span>{item.name}</span>
                <span>${parseFloat(item.price).toFixed(2)}</span>
              </li>
            ))
          ) : (
            <li className={styles.item}>No items found in this order.</li>
          )}
        </ul>
        <div className={styles.total}>
          Total Paid: ${parseFloat(session.total_price).toFixed(2)}
        </div>
      </div>
    </div>
  );
}