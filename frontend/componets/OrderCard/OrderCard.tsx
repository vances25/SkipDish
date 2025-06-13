"use client";

import { useState, useEffect } from "react";
import styles from "./style.module.css";

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity?: number;
}

interface Order {
  user_id: string;
  customer_name: string;
  items: OrderItem[];
  total_price: number;
  status: string;
  created_at: string;
  id: string;
  is_bumped?: boolean;
  bumped_at?: string;
  isCompleted?: boolean;
}

interface OrderCardProps {
  order: Order;
  refreshOrders: () => void;
}



export default function OrderCard({ order, refreshOrders }: OrderCardProps) {
  const [updating, setUpdating] = useState(false);
  const [justAdded, setJustAdded] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setJustAdded(false), 1000); // 1 second animation
    return () => clearTimeout(timer);
  }, []);

  const updateOrder = async (status: string) => {
  const token = localStorage.getItem("token");
  try {
    const tryUpdate = async (tokenToUse: string) => {
      return fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/vendors/orders/update`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenToUse}`,
        },
        body: JSON.stringify({ status: status, id: String(order.id) }),
      });
    };

    const res = await tryUpdate(token!);
    if (res.status === 403 || res.status === 401) {
      const refreshRes = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/refresh`, {
        method: "POST",
        credentials: "include",
      });

      if (refreshRes.ok) {
        const data = await refreshRes.json();
        localStorage.setItem("token", data.access_token);
        await tryUpdate(data.access_token);
      } else {
        throw new Error("Token refresh failed");
      }
    } else if (!res.ok) {
      throw new Error("Failed to update order");
    }
    refreshOrders();
  } catch (err) {
    console.error(err);
  }
};

  const formatTime = (isoString: string) => {
    const date = new Date(typeof isoString === "string" ? parseFloat(isoString) * 1000 : isoString * 1000);
    return date.toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
  };

  return (
    <div className={`${styles.card} ${order.is_bumped ? styles.bumped : ""} ${justAdded ? styles.justAdded : ""}`}>
      <div className={styles.header}>
        <h3>{order.customer_name}</h3>
        <p className={styles.time}>{formatTime(order.created_at)}</p>
       <span
        className={
          order.status === "completed"
            ? styles.completed
            : order.status === "in progress"
            ? styles.inProgress
            : styles.status
        }
      >
        {order.status}
        </span>
      </div>
      <ul className={styles.items}>
        {order.items.map((item, idx) => (
          <li key={idx}>
            {item.quantity && `${item.quantity}x `}{item.name} - ${item.price}
          </li>
        ))}
      </ul>
      <div className={styles.footer}>
        <strong>Total: ${order.total_price}</strong>
        <div className={styles.actions}>
         <button
           disabled={updating}
           className={order.status === "in progress" ? styles.active : ""}
           onClick={() => updateOrder("in progress")}
         >
           Start
         </button>
          <button
            disabled={updating}
            className={order.status === "completed" ? styles.active : ""}
            onClick={() => updateOrder("completed")}
          >
            Complete
          </button>
          <button
            disabled={updating}
            onClick={() => updateOrder("bumped")}
          >
            Bump
          </button>
          <button
            disabled={updating}
            onClick={() => {
              const confirmed = window.confirm("Are you sure you want to cancel this order?");
              if (confirmed) updateOrder("cancelled");
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}