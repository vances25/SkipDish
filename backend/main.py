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
import stripe
import json


load_dotenv()

database = None

stripe.api_key = os.getenv("STRIPE_KEY")

app = FastAPI(docs_url=None, redoc_url=None)
#app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        f"https://{os.getenv('DOMAIN')}",
        "http://localhost:3000"
        ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



def create_tokens(email, userid, role, time_delay=3600):
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
  

class Item(BaseModel):
    name: str
    price: float
class CheckoutSessionRequest(BaseModel):
    vendor_id: str
    amount_cents: int
    items: List[Item]
@app.post("/create-checkout-session")
async def checkoutSession(data: CheckoutSessionRequest, request: Request):
    db = request.app.state.db
    vendor = await db["users"]["users"].find_one({"user_id": data.vendor_id})

    if not vendor or "stripe_id" not in vendor:
        raise HTTPException(status_code=404, detail="Vendor not found or not connected to Stripe")

    order_id = str(uuid.uuid4())
    items = [item.dict() for item in data.items]  # Convert all to plain dicts
    json_string = json.dumps(items)

    # Simulate order creation and receipt insertion for test mode without hitting Stripe
    if vendor.get("test_mode"):
        order = {
            "id": order_id,
            "customer_name": "Test User",
            "items": items,
            "total_price": data.amount_cents * 0.01,
            "status": "pending",
            "created_at": time.time()
        }

        await request.app.state.db["users"]["vendors"].update_one(
            {"user_id": data.vendor_id},
            {"$push": {"orders": order}}
        )

        receipt = {
            "order_id": order_id,
            "vendor_id": data.vendor_id,
            "customer_name": "Test User",
            "items": items,
            "total_price": data.amount_cents * 0.01,
            "created_at": time.time()
        }

        await request.app.state.db["users"]["receipts"].insert_one(receipt)

        return {"url": f"{os.getenv('FRONTEND_URL')}/receipt?order_id={order_id}"}

    try:
        session = stripe.checkout.Session.create(
            metadata={
                "vendor_id": data.vendor_id,
                "order_id": order_id,
                "total_price": data.amount_cents * 0.01,
                "items": json_string
            },
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": "usd",
                    "product_data": {
                        "name": item.name,
                    },
                    "unit_amount": int(item.price * 100),
                },
                "quantity": 1
            } for item in data.items],
            mode="payment",
            success_url=f"{os.getenv('FRONTEND_URL')}/receipt?order_id={order_id}",
            cancel_url=f"{os.getenv('FRONTEND_URL')}/shop/{data.vendor_id}",
            payment_intent_data={
                "application_fee_amount": int(data.amount_cents * 0.1),
                "transfer_data": {
                    "destination": vendor["stripe_id"],
                },
                "on_behalf_of": vendor["stripe_id"]
            },
            stripe_account=vendor["stripe_id"],
        )
        return {"url": session.url}
    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/one_time_receipt/{order_id}")
async def get_one_time_receipt(order_id: str, request: Request):
    db = request.app.state.db
    receipt_db = db["users"]["receipts"]

    receipt = await receipt_db.find_one({"order_id": order_id}, {"_id": 0})
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")
    
    
    print(receipt)

    return receipt
    
    
@app.get("/account")
async def account_setting(request: Request, Authorization: str = Header(...)):
    db = request.app.state.db
    users_db = db["users"]["users"]

    result = decode_token(Authorization.split("Bearer ")[1], os.getenv("ACCESS_KEY"))
    
    if not result:
        raise HTTPException(status_code=403, detail="you are not permited here")
    
    users_data = await users_db.find_one({"user_id": result["sub"]}, {"_id": 0})
    
    if not users_data:
        raise HTTPException(status_code=404, detail="vendor not found")
    
    
    return {"detail": "worked", "email": users_data["email"]}

class UpdateAccount(BaseModel):
    change_type: str
    value: str
    old_password: str | None = None
@app.post("/update_account")
async def update_account(data: UpdateAccount, request: Request, Authorization: str = Header(...)):
    db = request.app.state.db
    users_db = db["users"]["users"]

    result = decode_token(Authorization.split("Bearer ")[1], os.getenv("ACCESS_KEY"))
    if not result:
        raise HTTPException(status_code=403, detail="you are not permitted here")

    user = await users_db.find_one({"user_id": result["sub"]})
    if not user:
        raise HTTPException(status_code=404, detail="vendor not found")

    if data.change_type == "email":
        await users_db.update_one({"user_id": result["sub"]}, {"$set": {"email": data.value}})
    elif data.change_type == "password":
        
        encrypted_password = bcrypt.hashpw(data.old_password.encode(), bcrypt.gensalt())
        stored_hash = bcrypt.checkpw(data.old_password.encode(), user["password"])
        
        
        print(f"sent password: {encrypted_password}")
        print(f"saved password{ user.get("password")}")
        
        
        
        if not data.old_password:
            raise HTTPException(status_code=401, detail="Old password is incorrect")
        
        stored_hash = bcrypt.checkpw(data.old_password.encode(), user["password"])
        
        if not stored_hash:
            raise HTTPException(status_code=401, detail="Old password is incorrect")
        
        new_password = bcrypt.hashpw(data.value.encode(), bcrypt.gensalt())
        await users_db.update_one({"user_id": result["sub"]}, {"$set": {"password": new_password}})
    else:
        raise HTTPException(status_code=400, detail="Invalid change type")

    return {"status": "updated"}

@app.post("/checkout_complete")
async def checkout_webhook(request: Request):
    db = request.app.state.db
    vendor_db = db["users"]["vendors"]
    receipt_db = db["users"]["receipts"]

    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    endpoint_secret = os.getenv("STRIPE_WEBHOOK_SECRET")

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, endpoint_secret)
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Webhook signature verification failed.")

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        metadata = session.get("metadata", {})
        print("Stripe Metadata:", metadata)

        vendor_id = metadata.get("vendor_id")
        order_id = metadata.get("order_id")
        customer_name = session.get("customer_details", {}).get("name", "")
        total_price = float(metadata.get("total_price", "0"))
        items_json = metadata.get("items", "[]")
        
        

        try:
            items = json.loads(items_json)
        except Exception as e:
            items = []

        order = {
            "id": order_id,
            "customer_name": customer_name,
            "items": items,
            "total_price": total_price,
            "status": "pending",
            "created_at": time.time()
        }

        await vendor_db.update_one({"user_id": vendor_id}, {"$push": {"orders": order}})

        receipt = {
            "order_id": order_id,
            "vendor_id": vendor_id,
            "customer_name": customer_name,
            "items": items,
            "total_price": total_price,
            "created_at": time.time()
        }
        await receipt_db.insert_one(receipt)


    return {"status": "success"}


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

    account = stripe.Account.create(type="express",
                                    capabilities={
                                        "card_payments": {"requested": True},
                                        "transfers": {"requested": True}
                                    })
    
    user_obj = {
        "password": encrypted_password,
        "email": email,
        "user_id": str(user_id),
        "is_verified": False,
        "role": "vendor",
        "verify_token": "",
        "stripe_id": account.id,
        "test_mode": True,
    }
  
    
    await users_db["users"].insert_one(user_obj)
    
    return {"detail": "success", "access_token": access_token}

@app.get("/vendor/restart_onboarding")
async def restart_onboarding(request: Request, Authorization: str = Header(...)):
    db = request.app.state.db
    users_db = db["users"]["users"]

    result = decode_token(Authorization.split("Bearer ")[1], os.getenv("ACCESS_KEY"))
    if not result:
        raise HTTPException(status_code=403, detail="Unauthorized")

    user = await users_db.find_one({"user_id": result["sub"]})
    if not user or "stripe_id" not in user:
        raise HTTPException(status_code=404, detail="Stripe account not found")

    account_link = stripe.AccountLink.create(
        account=user["stripe_id"],
        refresh_url=f"{os.getenv('FRONTEND_URL')}/dashboard",
        return_url=f"{os.getenv('FRONTEND_URL')}/dashboard",
        type="account_onboarding"
    )

    return {"url": account_link.url}

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

@app.get("/vendor/refresh")
async def refresh_onboarding(request: Request):
    token = request.cookies.get("access_token")  # or however you're handling auth
    if not token:
        return RedirectResponse("/login")

    user_data = decode_token(token, os.getenv("ACCESS_KEY"))
    if not user_data:
        return RedirectResponse("/login")

    db = request.app.state.db
    user = await db["users"]["users"].find_one({"user_id": user_data["sub"]})
    if not user or not user.get("stripe_id"):
        return RedirectResponse("/dashboard")

    account = stripe.Account.retrieve(user["stripe_id"])
    link = stripe.AccountLink.create(
        account=account.id,
        refresh_url=f"{os.getenv("BACKEND_URL")}/vendor/refresh",  # ← points to this same endpoint
        return_url=f"{os.getenv("FRONTEND_URL")}/dashboard",
        type="account_onboarding"
    )
    return RedirectResponse(link.url)


@app.post("/change_mode")
async def change_mode(request: Request, Authorization: str = Header(...)):
    db = request.app.state.db
    user_db = db["users"]["users"]
    
    
    result = decode_token(Authorization.split("Bearer ")[1], os.getenv("ACCESS_KEY"))
    
    if not result:
        raise HTTPException(status_code=403, detail="you are not permited here")
    
    current_user = await user_db.find_one({"user_id": result["sub"]}, {"_id": 0})
    
    if not current_user:
        raise HTTPException(status_code=404, detail="this user does not exist")
    
    account = stripe.Account.retrieve(current_user["stripe_id"])
    
    if not account.charges_enabled and not account.payouts_enabled:
        raise HTTPException(status_code=401, detail="please verfity your stripe account")
    
    new_mode = not current_user["test_mode"]
    
    
    
    
    await user_db.update_one({"user_id": result["sub"]}, {"$set": {"test_mode": new_mode}})

    return {"detail": "it work", "mode": new_mode}


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
    
    account = stripe.Account.retrieve(current_user["stripe_id"])
    

    if current_user["is_verified"]:
        requirements = account.get("requirements", {})
        if requirements.get("disabled_reason") or requirements.get("currently_due"):
            link = stripe.AccountLink.create(
                account=account.id,
                refresh_url=f"{os.getenv('BACKEND_URL')}/vendor/refresh",
                return_url=f"{os.getenv('FRONTEND_URL')}/dashboard",
                type="account_onboarding",
            )
            
            print("refresh link")
            return {
                "detail": "connect",
                "url": link.url,
                "test_mode": current_user["test_mode"],
                "missing": requirements.get("currently_due", []),
                "reason": requirements.get("disabled_reason", "incomplete")
            }

        if account.charges_enabled and account.payouts_enabled:
            return {"detail": "good", "test_mode": current_user["test_mode"], "role": current_user["role"]}
        else:
            print("new shit")
            link = stripe.AccountLink.create(
                account=account.id,
                refresh_url=f"{os.getenv("BACKEND_URL")}/vendor/refresh",  # ← points to this same endpoint
                return_url=f"{os.getenv("FRONTEND_URL")}/dashboard",
                type="account_onboarding",
            )
            return {"detail": "connect", "test_mode": current_user["test_mode"], "url": link.url}

    
    
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
            "orders": [],
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
    acct = stripe.Account.retrieve("acct_1RfnZrHBZgzEM4o0")
    print(acct)
