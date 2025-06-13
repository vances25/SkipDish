"use client";

import styles from "./page.module.css";
import { useState, useRef, ChangeEvent, useEffect } from "react";
import { useAuthGuard } from "../../../../hooks/useAuthGuard";
import VendorMenuItemCard from "../../../../componets/VendorMenuItemCard/VendorMenuItemCard";
import { useRouter } from "next/navigation";
import { jwtDecode } from "jwt-decode";

interface MenuItem {
  name: string;
  price: string;
  description: string;
  id: string;
}

export default function Menu() {
  const [shopName, setShopName] = useState<string>("");
  const [shopInput, setShopInput] = useState<string>("");
  const [changeName, setChangeName] = useState<boolean>(false);
  const [brandImage, setBrandImage] = useState<string>("https://placehold.co/600x400/png");
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [newItemName, setNewItemName] = useState<string>("");
  const [newItemPrice, setNewItemPrice] = useState<string>("");
  const [newItemDesc, setNewItemDesc] = useState<string>("");
  const [addItemPopup, setAddItemPopup] = useState<boolean>(false);
  const [error, setError] = useState<boolean>(false)
  const [editItem, setEditItem] = useState<MenuItem | null>(null);
  const [editItemPopup, setEditItemPopup] = useState<boolean>(false);
  const handleEditSubmit = () => {
    if (!editItem || !editItem.name.trim() || !editItem.price.trim()) return;

    const token = localStorage.getItem("token");

    const tryUpdateItem = (tokenToUse: string) => {
      return fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/vendor/menu/update`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${tokenToUse}`,
        },
        credentials: "include",
        body: JSON.stringify({
          id: editItem.id,
          name: editItem.name.trim(),
          price: editItem.price.trim(),
          description: editItem.description.trim(),
        }),
      });
    };

    tryUpdateItem(token!)
      .then(async (res) => {
        if (res.status === 403 || res.status === 401) {
          const refreshRes = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/refresh`, {
            method: "POST",
            credentials: "include",
          });

          if (refreshRes.ok) {
            const data = await refreshRes.json();
            localStorage.setItem("token", data.access_token);
            return tryUpdateItem(data.access_token);
          } else {
            throw new Error("Token refresh failed");
          }
        }
        return res;
      })
      .then((res) => {
        if (!res || !res.ok) throw new Error("Failed to update item");
        return res.json();
      })
      .then(() => {
        get_menu();
        setEditItem(null);
        setEditItemPopup(false);
      })
      .catch((err) => {
        console.error("Error editing menu item:", err);
      });
  };

  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isVerified = useAuthGuard("vendor");




  const deleteMenuItem = (itemId: string) => {
    const tryDelete = (tokenToUse: string) => {
      return fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/vendor/menu/delete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${tokenToUse}`,
        },
        credentials: "include",
        body: JSON.stringify({ id: itemId }),
      });
    };

  const token = localStorage.getItem("token");

  tryDelete(token!)
    .then(async (res) => {
      if (res.status === 401 || res.status === 403) {
        const refreshRes = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/refresh`, {
          method: "POST",
          credentials: "include",
        });

        if (refreshRes.ok) {
          const data = await refreshRes.json();
          localStorage.setItem("token", data.access_token);
          return tryDelete(data.access_token);
        } else {
          throw new Error("Token refresh failed");
        }
      }
      return res;
    })
    .then((res) => {
      if (!res.ok) throw new Error("Delete failed");
      return res.json();
    })
    .then(() => {
      get_menu(); // ✅ re-fetch menu after deletion
    })
    .catch((err) => {
      console.error("Error deleting item:", err);
    });
};


  const get_menu = () => {
  const token = localStorage.getItem("token");

  if (!token) return;

  let decoded: any;
  try {
    decoded = jwtDecode(token);
  } catch (e) {
    console.error("Failed to decode token", e);
    return;
  }

  const userId = decoded.sub;

  fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/vendor/menu/${userId}`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
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
          return get_menu(); // retry after refreshing
        } else {
          setError(!error);
          return;
        }
      }

      if (!res.ok) {
        setError(!error);
        return;
      }

      return res.json();
    })
    .then(data => {
      if (!data) return;
      setShopName(data.shop_name);
      setMenuItems(data.menu);
    })
    .catch(err => {
      console.error("Failed to load menu:", err);
    });
};

  useEffect(()=>{
    get_menu()

  }, [error])

  const handleNameChange = () => {
    const trimmed = shopInput.trim();
    if (!trimmed) return;

    const tryUpdate = (tokenToUse: string) => {
      return fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/vendor/menu/change_name`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${tokenToUse}`,
        },
        credentials: "include",
        body: JSON.stringify({ name: trimmed }),
      });
    };

    const token = localStorage.getItem("token");

    tryUpdate(token!)
      .then(async (res) => {
        if (res.status === 403 || res.status === 401) {
          const refreshRes = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/refresh`, {
            method: "POST",
            credentials: "include",
          });

          if (refreshRes.ok) {
            const data = await refreshRes.json();
            localStorage.setItem("token", data.access_token);
            return tryUpdate(data.access_token);
          } else {
            throw new Error("Token refresh failed");
          }
        }
        return res;
      })
      .then((res) => {
        if (!res || !res.ok) throw new Error("Failed to update shop name");
        return res.json();
      })
      .then(() => {
        setShopName(trimmed);
        setChangeName(false);
      })
      .catch(err => {
        console.error("Error updating shop name:", err);
      });
  };

  if (isVerified === null || isVerified === false) return null;

  const addMenuItem = () => {
  if (!newItemName.trim() || !newItemPrice.trim()) return;

  const token = localStorage.getItem("token");

  const tryAddItem = (tokenToUse: string) => {
    return fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/vendor/menu/add_item`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${tokenToUse}`,
      },
      credentials: "include",
      body: JSON.stringify({
        name: newItemName.trim(),
        price: newItemPrice.trim(),
        description: newItemDesc.trim(),
      }),
    });
  };

  tryAddItem(token!)
    .then(async (res) => {
      if (res.status === 403 || res.status === 401) {
        // Try refreshing
        const refreshRes = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/refresh`, {
          method: "POST",
          credentials: "include",
        });

        if (refreshRes.ok) {
          const data = await refreshRes.json();
          localStorage.setItem("token", data.access_token);
          return tryAddItem(data.access_token);
        } else {
          throw new Error("Token refresh failed");
        }
      }
      return res;
    })
    .then((res) => {
      if (!res || !res.ok) throw new Error("Failed to add item");
      return res.json();
    })
    .then(() => {
      get_menu();
      setNewItemName("");
      setNewItemPrice("");
      setNewItemDesc("");
      setAddItemPopup(false);
    })
    .catch((err) => {
      console.error("Error adding menu item:", err);
    });
};




  return (
    <>
      {changeName && (
        <div className={styles.new_shop}>
          <img onClick={() => setChangeName(false)} src="/icons/exit.png" />
          <div>
            <label htmlFor="shop_input">
              Enter New Shop Name:
              <input
                id="shop_input"
                value={shopInput}
                onChange={(e) => setShopInput(e.target.value)}
                placeholder="Type Here"
              />
            </label>
            <button onClick={handleNameChange}>Change Name</button>
          </div>
        </div>
      )}

      {addItemPopup && (
        <div className={styles.new_shop}>
          <img onClick={() => setAddItemPopup(false)} src="/icons/exit.png" />
          <div>
            <label>Item Name:
              <input type="text" value={newItemName} onChange={(e) => setNewItemName(e.target.value)} placeholder="Item Name" />
            </label>
            <label>Price:
              <input type="text" value={newItemPrice} onChange={(e) => setNewItemPrice(e.target.value)} placeholder="Price" />
            </label>
            <label>Description:
              <input type="text" value={newItemDesc} onChange={(e) => setNewItemDesc(e.target.value)} placeholder="Short description" />
            </label>
            <button onClick={addMenuItem}>Add Item</button>
          </div>
        </div>
      )}

      {editItemPopup && editItem && (
        <div className={styles.new_shop}>
          <img onClick={() => setEditItemPopup(false)} src="/icons/exit.png" />
          <div>
            <label>Item Name:
              <input
                type="text"
                value={editItem.name}
                onChange={(e) => setEditItem({ ...editItem, name: e.target.value })}
                placeholder="Item Name"
              />
            </label>
            <label>Price:
              <input
                type="text"
                value={editItem.price}
                onChange={(e) => setEditItem({ ...editItem, price: e.target.value })}
                placeholder="Price"
              />
            </label>
            <label>Description:
              <input
                type="text"
                value={editItem.description}
                onChange={(e) => setEditItem({ ...editItem, description: e.target.value })}
                placeholder="Short description"
              />
            </label>
            <button onClick={handleEditSubmit}>Save Changes</button>
          </div>
        </div>
      )}

      <div className={styles.container}>
        <img onClick={() => router.push("/dashboard")} className={styles.back_home} src="/icons/exit.png" />

        <div className={styles.top_section}>
          <div className={styles.brand_wrapper}>
           <img src="/logowords.png"/>
          </div>
        </div>

        <div className={styles.shopname}>
          <h1>{shopName}</h1>
          <img onClick={() => setChangeName(true)} src="/icons/pencil.png" />
        </div>

        <div className={styles.menu_section}>
          <button className={styles.add_button} onClick={() => setAddItemPopup(true)}>Add New Item</button>

          <div className={styles.menu_list}>
            {menuItems && menuItems.map((item, index) => (
              <VendorMenuItemCard
                key={index}
                name={item.name}
                price={item.price}
                description={item.description}
                card_id={item.id}
                onDelete={() => deleteMenuItem(item.id)}
                onEdit={() => {
                  setEditItem(item);
                  setEditItemPopup(true);
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}