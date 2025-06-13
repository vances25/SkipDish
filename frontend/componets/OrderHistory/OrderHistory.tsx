"use client";

import { useState } from "react";
import styles from "./style.module.css";
import OrderCard from "../OrderCard/OrderCard"; // adjust path if needed


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

interface Props {
  orders: Order[];
  onClose: () => void;
  refreshOrders: () => void;
}

export default function OrderHistoryPopup({ orders, onClose, refreshOrders }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [timeFilter, setTimeFilter] = useState("all"); // Options: all, 15m, 30m, 1h, 5h

  return (
    <div className={styles.overlay}>
      <div className={styles.popup}>
        <div className={styles.header}>
             <img onClick={() => onClose()} src="/icons/exit.png" alt="Back to Dashboard" className={styles.backIcon} />
          <h2>Order History</h2>
        </div>
        <div className={styles.content}>
          <input
            type="text"
            placeholder="Search by name or time..."
            className={styles.searchInput}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value.toLowerCase())}
          />
          <select
            className={styles.timeFilter}
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value)}
          >
            <option value="all">All Time</option>
            <option value="15m">Last 15 minutes</option>
            <option value="30m">Last 30 minutes</option>
            <option value="1h">Last 1 hour</option>
            <option value="5h">Last 5 hours</option>
          </select>
          {orders.length ? (
            orders
              .filter((order) => {
      
                const now = Date.now();
                const orderTime = new Date(typeof order.created_at === "string" ? parseFloat(order.created_at) * 1000 : order.created_at * 1000).getTime();
                const createdAtStr = new Date(
                  typeof order.created_at === "string"
                    ? parseFloat(order.created_at) * 1000
                    : order.created_at * 1000
                ).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }).toLowerCase();

                const nameMatch =
                  order.customer_name.toLowerCase().includes(searchQuery) ||
                  createdAtStr.includes(searchQuery);

                let timeLimit = Infinity;
                if (timeFilter === "15m") timeLimit = 15 * 60 * 1000;
                else if (timeFilter === "30m") timeLimit = 30 * 60 * 1000;
                else if (timeFilter === "1h") timeLimit = 60 * 60 * 1000;
                else if (timeFilter === "5h") timeLimit = 5 * 60 * 60 * 1000;

                const withinTimeFilter = now - orderTime <= timeLimit;

                return withinTimeFilter && nameMatch;
              })
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              .map((order) => (
                <OrderCard key={order.id} order={order} refreshOrders={refreshOrders} />
              ))
          ) : (
            <p>No past orders yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}