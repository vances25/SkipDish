import { userAgent } from "next/server"
import styles from "./style.module.css"

import { useRouter } from "next/navigation"

const url = process.env.NEXT_PUBLIC_BACKEND_URL

export default function Nav(){

    const router = useRouter()

    const logout = () =>{

        
        fetch(`${url}/logout`, {
            method: "POST",
            credentials: "include",
        })
        .then(res => res.json())
        .then(data=>router.push("/"))
        .catch(e=>console.log(e))

        
        localStorage.removeItem("token")
    }




    return (
        <>
        <div className={styles.container}>
            
        <img src="/logowhite.png"></img>

        <button onClick={()=> logout()}>Logout</button>
        </div>
        </>
    )
}