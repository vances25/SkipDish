"use client";

import styles from "./page.module.css";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";


export default function Home() {

  const [showNotice, setShowNotice] = useState(false);

  useEffect(() => {
    const seen = sessionStorage.getItem("hasSeenNotice");
    if (!seen) {
      setShowNotice(true);
      sessionStorage.setItem("hasSeenNotice", "true");
    }
  }, []);

  let router = useRouter()
  return (
    <>
      {showNotice && (
        <div className={styles.popup}>
          <div className={styles.popupContent}>
            <h2>Heads Up!</h2>
            <p>Right now, everything is 100% free to use while we’re in early access. You can explore all features, create a menu, and test the system—no payment setup needed.
              <br/>
              At the moment, orders can’t be paid for directly—Stripe integration is coming soon so you’ll be able to accept real customer payments.

<br/><br/>Thanks for checking us out early. We’re excited to grow with your feedback!</p>
            <button onClick={() => setShowNotice(false)}>Got it!</button>
          </div>
        </div>
      )}
      <div className={styles.container}>

      <section id="home" className={styles.header}>
          <img src="/logowords.png" />
          <div className={styles.nav}>
            <a href="#home">Home</a>
            <a href="#solutions">Solutions</a>
            <a href="#pricing">Pricing</a>
          </div>
        <button onClick={()=> router.push("/login")} className={styles.login}>Login</button>
      </section>

      <section className={`${styles.action}`}>
        <img className={styles.burger} src="/burger.png"></img>
        <img className={styles.fry} src="fry.png"></img>
        <img className={styles.taco} src="/taco.png"></img>
        <div className={styles.infotext}>
        <div>
        <h1>Grow Your Food Truck Business with SkipDish</h1>
        <p>Accept pre-orders, cut down wait times, and serve more customers—without the chaos.</p>
        </div>
        <button onClick={()=> router.push("/register")}>Sign Up for Free</button>
        </div>
        

        
        <img src="/order.png"></img>
      </section>



      <section id="solutions" className={styles.solutions}>
          <p>Our Solutions</p>
    <h1>The service we offer</h1>

    <div className={styles.solutionCards}>
      <div className={styles.card}>
        <img src="/icons/preorder.png"></img>
        <div>
        <h2>Pre-Order System</h2>
        <p>Let customers place orders before they arrive, so you can prepare ahead and serve faster.</p>
        </div>
      </div>

      <div className={styles.card}>
        <img src="/icons/clock.png"></img>
        <div>
        <h2>Real-Time Menu Updates</h2>
        <p>Update your menu instantly and let customers know what’s available—even if you're on the move.</p>
        </div>
      </div>

      <div className={styles.card}>
        <img src="/icons/dashboard.png"></img>
        <div>
          <h2>Order Dashboard</h2>
          <p>View and manage incoming orders from a clean, mobile-friendly dashboard.</p>
          </div>
      </div>

      <div className={styles.card}>
        <img src="/icons/insite.png"></img>
        <div>
          <h2>Customer Insights</h2>
          <p>Track repeat customers, order history, and top-selling items to grow smarter.</p>
        </div>
      </div>
    </div>
  </section>


  <section className={styles.how_works}>
    <h1>How It Works</h1>
    <div className={styles.steps}>


      <div>
        <h3> Display Your QR Code</h3>
        <p>We give you a unique QR code for your truck.</p>
      </div>
      <img src="/qrcode.png"></img>

      <div>
        <h3>Get More Customers</h3>
        <p>Visitors scan the code to access your menu and pre-order meals.</p>
      </div>
      <img src="/icons/customer.png"></img>

      <div>
        <h3>Streamline Fulfillment</h3>
        <p>Prepre pre-orders in advance and cut down on wait times.</p>
      </div>
      <img src="/icons/stream.png"></img>

    </div>
  </section>


      <section id="pricing" className={styles.pricing}>
        <h1>Pricing</h1>

      <div className={styles.options}>
    <div>
      <h3>SkipDish Pricing</h3>
      <h2>No monthly fees</h2>
      <p><img src="/icons/checkmark.png" /> Only pay when you earn</p>
      <p><img src="/icons/checkmark.png" /> 5% per online order</p>
      <p><img src="/icons/checkmark.png" /> Instant access to dashboard</p>
      <p><img src="/icons/checkmark.png" /> Menu + QR code setup included</p>
      <p><img src="/icons/checkmark.png" /> Branded ordering page</p>
      <p><img src="/icons/checkmark.png" /> Email support included</p>
    </div>
</div>

        <button onClick={()=> router.push("/register")}>Try Now</button>
      </section>

      <footer className={styles.footer}>
      <div className={styles.footerContent}>
        <div className={styles.column}>
          <h3>SkipDish</h3>
          <p>Helping food trucks streamline pre-orders and grow their business.</p>
        </div>

        <div className={styles.column}>
          <h4>Links</h4>
          <div>
          <a href="#home">Home</a>
          <a href="#solutions">Solutions</a>
          <a href="#pricing">Pricing</a>
          </div>
        </div>

        <div className={styles.column}>
          <h4>Legal</h4>
          <div>
            <a href="#">Terms of Service</a>
            <a href="#">Privacy Policy</a>
          </div>
        </div>

        <div className={styles.column}>
          <h4>Contact</h4>
          <div>
          <p>support@skipdish.com</p>
          </div>
        </div>
      </div>

      <div className={styles.footerBottom}>
        <p>&copy; 2025 SkipDish. All rights reserved.</p>
      </div>
    </footer>


      </div>
    </>
  );
}
