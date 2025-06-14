from fastapi import FastAPI, HTTPException, Request, Response, Header, UploadFile, File
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorClient
import asyncio
import uuid
import jwt
import time
from dotenv import load_dotenv
import os
import asyncio
import bcrypt
from fastapi.middleware.cors import CORSMiddleware
import requests
from PIL import Image
import time
from typing import List

load_dotenv()

database = None

app = FastAPI(docs_url=None, redoc_url=None)
#app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        f"https://{os.getenv('DOMAIN')}"
        ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



def create_tokens(email, userid, role, time_delay=5):
    REFRESH_KEY = os.getenv("REFRESH_KEY")
    ACCESS_KEY = os.getenv("ACCESS_KEY")
    
    algorithm = "HS256"
    
    now = time.time()
    
    access_payload = {
        "exp": now + time_delay,
        "iat": now,
        "email": email,
        "role": role,
        "sub": userid
    }
    
    refresh_payload = {
        "exp": now + (60 * 60 * 24 * 7),
        "iat": now,
        "email": email,
        "sub": userid
    }
    
    access_token = jwt.encode(access_payload, ACCESS_KEY, algorithm=algorithm)
    refresh_token = jwt.encode(refresh_payload, REFRESH_KEY, algorithm=algorithm)
    
    return access_token, refresh_token

def decode_token(token, key):
    algorithm = "HS256"
    
    try:
        access_data = jwt.decode(token, key, algorithms=[algorithm])
        
        return access_data

    except jwt.exceptions.InvalidSignatureError:
        print("Signature verification failed.")
        return None
    except jwt.exceptions.ExpiredSignatureError:
        print("Token has expired.")
        return None
    except jwt.exceptions.InvalidTokenError:
        print("Invalid token format")
        return None
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        return None


@app.on_event("startup")
async def startup():
    global database, DB_URL, SECRET_KEY
    
    DB_URL = os.getenv("DB_URL")

    
    database = AsyncIOMotorClient(DB_URL)
    
    app.state.db = database
    
    
    
    print("start up completed")
    

class Login(BaseModel):
    email: str
    password: str
@app.post("/login")
async def login(data: Login, request: Request, response: Response):
    db = request.app.state.db
    users_db = db["users"]
    token_db = db["users"]["tokens"]
    
    email = data.email
    password = data.password
    
    user_account = await users_db["users"].find_one({"email": email}, {"_id": 0})
    
    if not user_account:
        raise HTTPException(status_code=404, detail="email address does not exist")
    
    stored_hash = bcrypt.checkpw(password.encode(), user_account["password"])
    
    if not stored_hash:
        raise HTTPException(status_code=401, detail="please check your password")
    
    access_token, refresh_token = create_tokens(email, user_account["user_id"], user_account["role"])
    

    token_obj = {
        "refresh_token": refresh_token,
        "email": user_account["email"],
        "user_id": str(user_account["user_id"])
    }
    

    await asyncio.gather(
        users_db["tokens"].insert_one(token_obj),
        token_db.delete_one({"refresh_token": refresh_token})
        )
    
    
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,
        samesite="None",
        max_age=60 * 60 * 24 * 7,  # 7 days
        path="/refresh",
        domain=os.getenv("DOMAIN")
    )
    
    
    
    return {"detail": "success", "access_token": access_token}

class Register(BaseModel):
    email: str
    password: str
@app.post("/register")
async def register(data: Register, request: Request, response: Response):
    db = request.app.state.db
    
    users_db = db["users"]
    
    email = data.email
    
    password = data.password
    
    check_email =  await users_db["users"].find_one({"email": email})
    
    if check_email:
        raise HTTPException(status_code=409, detail="email is already registered")
    
    if len(password) <= 4:
        raise HTTPException(status_code=409, detail="password must be at least 5 characters long")
    
    encrypted_password = bcrypt.hashpw(password.encode(), bcrypt.gensalt())
    user_id = str(uuid.uuid4())
    
    
    role = "vendor"
    
    access_token, _ = create_tokens(email=email, userid=user_id, role=role, time_delay=60)

    user_obj = {
        "password": encrypted_password,
        "email": email,
        "user_id": str(user_id),
        "is_verified": False,
        "role": "vendor",
        "verify_token": "",
        "orders": []
    }
  
    
    await users_db["users"].insert_one(user_obj)
    
    return {"detail": "success", "access_token": access_token}


@app.post("/refresh")
async def refresh(request: Request, response: Response):
    db = request.app.state.db
    refresh_token = request.cookies.get("refresh_token")
    
    print(request.cookies)
    payload = decode_token(refresh_token, os.getenv("REFRESH_KEY"))
    
    if not payload:
        raise HTTPException(status_code=403, detail="expired refresh token")
    
    user_id = payload["sub"]
    
    token_exist, user_data = await asyncio.gather(
        db["users"]["tokens"].find_one({"refresh_token": refresh_token}),
        db["users"]["users"].find_one({"user_id": user_id}, {"_id": 0})
        )
    
    if not token_exist and not user_data:
        raise HTTPException(status_code=404, detail="token and or user can not be found")
    
    access_token, new_refresh_token = create_tokens(payload["email"], user_id, user_data["role"])
    print(new_refresh_token)
    token_obj = {
        "refresh_token": new_refresh_token,
        "email": payload["email"],
        "user_id": user_id
    }

    await asyncio.gather(
        db["users"]["tokens"].delete_one({"refresh_token": refresh_token, "user_id": user_id}),
        db["users"]["tokens"].insert_one(token_obj)
        )
    
    response.set_cookie(
        key="refresh_token",
        value=new_refresh_token,
        httponly=True,
        secure=True,
        samesite="None",
        max_age=60 * 60 * 24 * 7,  # 7 days
        path="/refresh",
        domain=os.getenv("DOMAIN")
    )
    
    
    return {"access_token": access_token}

@app.get("/check-verify-status")
async def check_status(request: Request, Authorization: str = Header(...)):
    db = request.app.state.db
    
    
    result = decode_token(Authorization.split("Bearer ")[1], os.getenv("ACCESS_KEY"))
    
    if not result:
        raise HTTPException(status_code=403, detail="you are not permited here")
    
    current_user = await db["users"]["users"].find_one({"user_id": result["sub"]}, {"_id": 0})
    
    if not current_user:
        raise HTTPException(status_code=404, detail="this user does not exist")
    
    is_verified = False
    
    if current_user["is_verified"]:
        return {"detail": "good", "role": current_user["role"]}
    
    return {"detail": "please verify"}



class SendEmail(BaseModel):
    to_email: str
@app.post("/send_email")
async def send_email(request: Request, data: SendEmail):
    
    user_db = request.app.state.db["users"]["users"]
    
    server_email = f"noreply@{os.getenv("DOMAIN")}"
    
    to_email = data.to_email
    
    user_data = await user_db.find_one({"email": to_email}, {"_id":0})
    
    if not user_data:
        return
    
    if user_data["is_verified"] == True:
        raise HTTPException(status_code=401, detail="action is not permited")
        
    
    token = str(uuid.uuid4())
    
    await user_db.update_one({"email": to_email}, {"$set": {"verify_token": token}})
    
    api_key = os.getenv("BREVO_KEY")
    url = "https://api.brevo.com/v3/smtp/email"
    headers = {
        "accept": "application/json",
        "api-key": api_key,
        "content-type": "application/json"
    }
    data = {
        "sender": {
            "name": "SkipDish Email Verification",
            "email": server_email  # this must be a verified sender in Brevo
        },
        "to": [
            { "email": to_email }
        ],
        "subject": "Verify your email",
        "htmlContent": f"""
            <p>Click the link to verify your email:</p>
            <a href="https://{os.getenv('DOMAIN')}/confirm?token={token}">Verify Email</a>
        """
    }

    response = requests.post(url, headers=headers, json=data)
    print(response.status_code)
    print(response.json())
    if response.ok:
        return {"detail": "please check your email"}
    else:
        raise HTTPException(status_code=500, detail="something bad happened")
        
class VerifyUser(BaseModel):
    token: str
@app.post("/verify_user")
async def verify_user(request: Request, data: VerifyUser):
    db = request.app.state.db
    user_db = db["users"]["users"]
    token = data.token
    
    print(token)
    
    result = await user_db.find_one({"verify_token": token}, {"_id": 0})
    
    if not result:
        raise HTTPException(status_code=404, detail="token is expired or not found")
    
    
    await asyncio.gather(
        user_db.update_one({"verify_token": token}, {"$set":{
        "verify_token": "",
        "is_verified": True
    }}),
        db["users"]["vendors"].insert_one({
            "user_id": result["user_id"],    
            "shop_name": "Awesome Taco Truck",
            "logo_url": "",
            "menu": [
                {
                "name": "Beef Taco",
                "price": "4.99",
                "description": "Soft shell taco with seasoned beef and toppings",
                "id": str(uuid.uuid4())
                },
            ],
            "created_at": time.time(),
            "updated_at": time.time()
            })
    )
    
    return {"detail": "user is now verified"}
    

@app.post("/logout")
async def logout(request: Request, response: Response):
    db = request.app.state.db
    token_db = db["users"]["tokens"]
    
    refresh_token = request.cookies.get("refresh_token")
    
    await token_db.delete_one({"refresh_token": refresh_token})
    response.delete_cookie("refresh_token")
    
    return {"detail": "logged out successfully"}


@app.get("/vendor/menu/{user_id}")
async def vendor_menu(request: Request, user_id: str):
    db = request.app.state.db
    vendors_db = db["users"]["vendors"]

    vendor_data = await vendors_db.find_one({"user_id": user_id}, {"_id": 0})
    print(vendor_data)
    
    if not vendor_data:
        raise HTTPException(status_code=404, detail="vendor not found")
    
    
    return vendor_data
    

class AddItem(BaseModel):
    name: str
    price: str
    description: str
@app.post("/vendor/menu/add_item")
async def add_item(data: AddItem, request: Request, Authorization: str = Header(...)):
    db = request.app.state.db
    vendors_db = db["users"]["vendors"]

    result = decode_token(Authorization.split("Bearer ")[1], os.getenv("ACCESS_KEY"))
    
    if not result:
        raise HTTPException(status_code=403, detail="you are not permited here")
    
    vendor_data = await vendors_db.find_one({"user_id": result["sub"]}, {"_id": 0})
    
    if not vendor_data:
        raise HTTPException(status_code=404, detail="vendor not found")
    
    
    await vendors_db.update_one(
        {"user_id": result["sub"]},  # match filter
        {"$push": {"menu": {"name": data.name, "price": data.price, "description": data.description, "id": str(uuid.uuid4())}}}
    )
    
    
    return {"detail": "success"}
    
    
class ChangeName(BaseModel):
    name: str
@app.put("/vendor/menu/change_name")
async def change_name(data: ChangeName, request: Request, Authorization: str = Header(...)):
    db = request.app.state.db
    vendors_db = db["users"]["vendors"]

    result = decode_token(Authorization.split("Bearer ")[1], os.getenv("ACCESS_KEY"))
    
    if not result:
        raise HTTPException(status_code=403, detail="you are not permited here")
    
    vendor_data = await vendors_db.find_one({"user_id": result["sub"]}, {"_id": 0})
    
    if not vendor_data:
        raise HTTPException(status_code=404, detail="vendor not found")
    
    
    await vendors_db.update_one(
    {"user_id": result["sub"]},  # match filter
    {"$set": {"shop_name": data.name}}
    )
    
    return {"detail": "success"}
    
    
    
class DeleteItem(BaseModel):
    id: str
@app.post("/vendor/menu/delete")
async def delete_item(data: DeleteItem, request: Request, Authorization: str = Header(...)):
    
    
    print(Authorization)
    db = request.app.state.db
    vendors_db = db["users"]["vendors"]

    result = decode_token(Authorization.split("Bearer ")[1], os.getenv("ACCESS_KEY"))
    
    if not result:
        raise HTTPException(status_code=403, detail="you are not permited here")
    
    await vendors_db.update_one({"user_id": result["sub"]}, {"$pull": {
        "menu": {"id": data.id}
    }})
    
    return {"detail": "success"}
    
class UpdateItem(BaseModel):
    id: str
    name: str
    price: str
    description: str
@app.put("/vendor/menu/update")
async def update_item(data: UpdateItem, request: Request, Authorization: str = Header(...)):
    db = request.app.state.db
    vendors_db = db["users"]["vendors"]

    result = decode_token(Authorization.split("Bearer ")[1], os.getenv("ACCESS_KEY"))
    
    if not result:
        raise HTTPException(status_code=403, detail="you are not permited here")
    
    await vendors_db.update_one(
        { "user_id": result["sub"], "menu.id": data.id },
        {
            "$set": {
                "menu.$.name": data.name,
                "menu.$.price": data.price,
                "menu.$.description": data.description
            }
        }
    )
    return {"detail": "success"}

class OneItem(BaseModel):
    id: str
    name: str
    price: str
class CreateOrder(BaseModel):
    user_id: str
    name: str
    total_price: float
    items: List[OneItem]
@app.post("/vendors/order/create")
async def new_order(request: Request, data: CreateOrder):
    db = request.app.state.db
    vendors_db = db["users"]["vendors"]
    
    
    await vendors_db.update_one({"user_id": data.user_id}, {"$push":{
            "orders": {
                "id": str(uuid.uuid4()),
                "customer_name": data.name,
                "items": [item.dict() for item in data.items],
                "total_price": data.total_price,
                "status": "pending",
                "created_at": time.time()
            }
            }
        })
    return {"detail": "order added"}

@app.get("/vendors/orders")
async def get_orders(request: Request, Authorization: str = Header(...)):
    db = request.app.state.db
    vendors_db = db["users"]["vendors"]

    result = decode_token(Authorization.split("Bearer ")[1], os.getenv("ACCESS_KEY"))
    
    if not result:
        raise HTTPException(status_code=403, detail="you are not permited here")
    
    order_data = await vendors_db.find_one({"user_id": result["sub"]}, {"_id": 0})
    
    if not order_data:
        raise HTTPException(status_code=404, detail="vendor not found!")
    
    return {"detail": "success", "orders": order_data["orders"]}
   
class UpdateStatus(BaseModel):
    status: str
    id: str
@app.put("/vendors/orders/update")
async def update_status(data: UpdateStatus, request: Request, Authorization: str = Header(...)):
    db = request.app.state.db
    vendors_db = db["users"]["vendors"]

    result = decode_token(Authorization.split("Bearer ")[1], os.getenv("ACCESS_KEY"))
    
    if not result:
        raise HTTPException(status_code=403, detail="you are not permited here")
    
    test = await vendors_db.find_one(
        { "user_id": result["sub"], "orders.id": data.id},
    )
    
    print(test)
    
    ppp = await vendors_db.update_one(
        { "user_id": result["sub"], "orders.id": data.id },
            {
                "$set": {
                    "orders.$.status": data.status,
                }
            }
        )
    
    print(ppp)
    
    return {"detail": "success"}
    


if __name__ == "__main__":
    pass
