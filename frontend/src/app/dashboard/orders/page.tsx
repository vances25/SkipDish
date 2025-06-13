"use client";

import { useEffect, useState, useCallback } from "react"; // Import useCallback
import { useAuthGuard } from "../../../../hooks/useAuthGuard";
import styles from "./page.module.css"; // Import the CSS module
import OrderCard from "../../../../componets/OrderCard/OrderCard";
import OrderHistoryPopup from "../../../../componets/OrderHistory/OrderHistory"; // adjust if path differs

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity?: number; // Added quantity as it appears in rendering
}

interface Order {
  user_id: string;
  customer_name: string;
  items: OrderItem[];
  total_price: number;
  status: string;
  created_at: string;
  id: string;
  // Add a property to indicate if the order has been "bumped" recently,
  // this could be a timestamp or a boolean from your backend if you track it.
  // For client-side visual effect, we'll use a temporary state,
  // but ideally, this comes from the backend.
  is_bumped?: boolean;
  bumped_at?: string; // Example: if your backend stores a timestamp
  isCompleted?: boolean;
}

// Define possible order statuses
const ORDER_STATUSES = [
  "pending",
  "in progress",
  "ready",
  "completed",
  "cancelled",
];

export default function DashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  const isVerified = useAuthGuard("vendor");

  const fetchOrders = useCallback(() => {
    // Wrap fetchOrders in useCallback to prevent unnecessary re-creation
    const token = localStorage.getItem("token");

    const tryFetch = (tokenToUse: string) => {
      return fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/vendors/orders`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenToUse}`,
        },
      });
    };

    tryFetch(token!)
      .then(async (res) => {
        if (res.status === 403 || res.status === 401) {
          const refreshRes = await fetch(
            `${process.env.NEXT_PUBLIC_BACKEND_URL}/refresh`,
            {
              method: "POST",
              credentials: "include",
            }
          );

          if (refreshRes.ok) {
            const data = await refreshRes.json();
            localStorage.setItem("token", data.access_token);
            return tryFetch(data.access_token);
          } else {
            throw new Error("Token refresh failed");
          }
        }
        return res;
      })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch orders");
        return res.json();
      })
      .then((data) => {
        // Assume data.orders now includes `is_bumped` or `bumped_at` if your backend supports it
        const statusPriority: Record<"pending" | "in progress" | "ready" | "completed" | "cancelled", number> = {
          pending: 1,
          "in progress": 2,
          ready: 3,
          completed: 4,
          cancelled: 5,
        };
        const sortedOrders = (data.orders || []).sort((a: Order, b: Order) => {
          if (statusPriority[a.status as keyof typeof statusPriority] !== statusPriority[b.status as keyof typeof statusPriority]) {
            return statusPriority[a.status as keyof typeof statusPriority] - statusPriority[b.status as keyof typeof statusPriority];
          }
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        });

        setOrders(
          sortedOrders.map((order: Order) => ({
            ...order,
            isCompleted: order.status === "completed",
          }))
        );
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching orders:", error);
        setLoading(false);
      });
  }, []); // Empty dependency array means it's created once

  // Function to implement your network logic for updating status
  const performUpdateStatusNetworkCall = async (
    orderId: string,
    newStatus: string
  ) => {
    const token = localStorage.getItem("token");
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/vendors/orders/${orderId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // If the update was successful on the backend, trigger a re-fetch
      // This ensures the UI is consistent with the backend state, including highlights.
      fetchOrders();
    } catch (error) {
      console.error("Error updating order status:", error);
      // Optionally, show an error message to the user
    }
  };

  // Function to implement your network logic for bumping an order
  const performBumpOrderNetworkCall = async (orderId: string) => {
    const token = localStorage.getItem("token");
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/vendor/orders/${orderId}/bump`, // Example endpoint
        {
          method: "POST", // Or PATCH, depending on your API design
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          // You might send an empty body or a specific payload
          body: JSON.stringify({ action: "bump" }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Temporarily move the order to the top for immediate visual feedback
      setOrders((prevOrders) => {
        const bumpedOrder = prevOrders.find((order) => order.user_id === orderId);
        if (!bumpedOrder) return prevOrders;

        const filteredOrders = prevOrders.filter((order) => order.user_id !== orderId);
        // Add a temporary client-side flag if your backend doesn't immediately send it back
        return [{ ...bumpedOrder, is_bumped: true }, ...filteredOrders];
      });

      // After a short delay, trigger a full re-fetch to get the true,
      // backend-ordered list (e.g., if bumping affects the global order).
      // Or, if your backend immediately returns the new order, this might not be needed.
      setTimeout(() => {
        fetchOrders();
      }, 500); // Give it a moment for the backend to process and for the UI to show the temp bump

    } catch (error) {
      console.error("Error bumping order:", error);
      // Optionally, show an error message to the user
    }
  };


  useEffect(() => {
    fetchOrders(); // Initial fetch

    const interval = setInterval(() => {
      fetchOrders(); // Re-fetch every 10 seconds
    }, 3000); // 10000ms = 10s

    return () => clearInterval(interval); // cleanup when component unmounts
  }, [fetchOrders]); // Include fetchOrders in dependency array because it's wrapped in useCallback

  if (isVerified === null || isVerified === false) return null;

  if (loading) return (<div className={styles.loading}>Loading orders...</div>);

  const sortedOrdersByStatus = [...orders].sort((a, b) => {
    const priority: Record<string, number> = {
      "in progress": 0,
      "pending": 1,
      "completed": 2,
    };
    return priority[a.status.toLowerCase()] - priority[b.status.toLowerCase()];
  });

  return (
    <div className={styles.container}>
      <div className={styles.topBar}>
        <img onClick={() => window.location.href = "/dashboard"} src="/icons/exit.png" alt="Back to Dashboard" className={styles.backIcon} />
        <h1 className={styles.title}>Order Dashboard</h1>
      </div>
      <button onClick={() => setShowHistory(true)} className={styles.historyButton}>
        View Order History
      </button>
      {showHistory && (
        <OrderHistoryPopup
          orders={orders}
          onClose={() => setShowHistory(false)}
          refreshOrders={fetchOrders}
        />
      )}
      {orders.length === 0 ? (
        <p className={styles.noOrders}>No orders yet.</p>
      ) : (
        sortedOrdersByStatus
          .filter(order => order.status !== "bumped" && order.status !== "cancelled")
          .map((order) => (
            <OrderCard key={order.id} order={order} refreshOrders={fetchOrders} />
          ))
      )}
    </div>
  );
}