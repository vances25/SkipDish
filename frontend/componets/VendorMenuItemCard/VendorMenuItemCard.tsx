"use client";

import styles from "./style.module.css";

interface VendorMenuItemCardProps {
  name: string;
  price: string;
  description?: string;
  card_id: string;
  onDelete?: () => void;   // already exists
  onEdit?: () => void;     // new prop (example)
}
export default function VendorMenuItemCard({
  name,
  price,
  description,
  card_id,
  onDelete,
  onEdit
}: VendorMenuItemCardProps) {





  return (
    <div className={styles.menu_card}>
      <div className={styles.menu_info}>
        <h3>{name}</h3>
        <p>{description || "No description provided."}</p>
      </div>
      <div className={styles.menu_action}>
        <span className={styles.price}>${price}</span>
        <div className={styles.actions}>
          <button onClick={onEdit}>Edit</button>
          <button onClick={onDelete} className={styles.delete_button}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}