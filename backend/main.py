from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks, status
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any, Optional
from datetime import datetime, date
from pydantic import BaseModel

import models
import database
import ai_agent
import auth
import compta_agent

# Créer les tables dans la base de données
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="Assistant Comptable IA - Backend SaaS")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- SCHEMAS PYDANTIC ---

class RegisterSchema(BaseModel):
    username: str
    password: str
    restaurant_name: str
    whatsapp_phone: Optional[str] = None

class LoginSchema(BaseModel):
    username: str
    password: str

# --- ENDPOINTS AUTHENTIFICATION (SaaS) ---

@app.post("/api/auth/register")
def register(payload: RegisterSchema, db: Session = Depends(database.get_db)):
    # Vérifier si l'utilisateur existe déjà
    existing_user = db.query(models.User).filter(models.User.username == payload.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Ce nom d'utilisateur est déjà pris")

    # Vérifier si le numéro WhatsApp existe déjà
    if payload.whatsapp_phone:
        existing_restaurant = db.query(models.Restaurant).filter(models.Restaurant.whatsapp_phone == payload.whatsapp_phone).first()
        if existing_restaurant:
            raise HTTPException(status_code=400, detail="Ce numéro WhatsApp est déjà associé à un autre maquis")

    # 1. Créer le restaurant
    new_restaurant = models.Restaurant(
        name=payload.restaurant_name,
        whatsapp_phone=payload.whatsapp_phone
    )
    db.add(new_restaurant)
    db.commit()
    db.refresh(new_restaurant)

    # 2. Créer le gérant
    hashed_pwd = auth.get_password_hash(payload.password)
    new_user = models.User(
        username=payload.username,
        hashed_password=hashed_pwd,
        restaurant_id=new_restaurant.id
    )
    db.add(new_user)
    db.commit()
    
    return {"message": "Compte restaurant créé avec succès ! Connectez-vous maintenant."}

@app.post("/api/auth/login")
def login(payload: LoginSchema, db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.username == payload.username).first()
    if not user or not auth.verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Identifiants incorrects")
    
    # Générer le token JWT
    access_token = auth.create_access_token(data={"sub": user.username})
    
    # Récupérer les détails du restaurant
    restaurant = db.query(models.Restaurant).filter(models.Restaurant.id == user.restaurant_id).first()
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "restaurant_name": restaurant.name if restaurant else "Mon Maquis",
        "whatsapp_phone": restaurant.whatsapp_phone if restaurant else None
    }

# --- ENDPOINTS COMPTABILITÉ & DASHBOARD (PROTÉGÉS PAR RESTAURANT) ---

@app.get("/api/dashboard/stats")
def get_dashboard_stats(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(database.get_db)):
    restaurant_id = current_user.restaurant_id
    today = date.today()
    
    # Chiffre d'affaires du jour pour ce restaurant spécifique
    daily_sales = db.query(models.Transaction).filter(
        models.Transaction.restaurant_id == restaurant_id,
        models.Transaction.type == "income",
        models.Transaction.created_at >= datetime.combine(today, datetime.min.time())
    ).with_entities(models.func.sum(models.Transaction.amount)).scalar() or 0.0

    # Nombre de commandes validées aujourd'hui pour ce restaurant
    daily_orders = db.query(models.Order).filter(
        models.Order.restaurant_id == restaurant_id,
        models.Order.status.in_(["En préparation", "Prêt", "Livré"]),
        models.Order.created_at >= datetime.combine(today, datetime.min.time())
    ).count()

    # Commandes WhatsApp en attente pour ce restaurant
    pending_orders = db.query(models.Order).filter(
        models.Order.restaurant_id == restaurant_id,
        models.Order.status == "Nouveau",
        models.Order.source == "whatsapp"
    ).count()

    return {
        "daily_sales": daily_sales,
        "daily_orders": daily_orders,
        "pending_whatsapp_orders": pending_orders
    }

@app.get("/api/orders/recent")
def get_recent_orders(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(database.get_db)):
    restaurant_id = current_user.restaurant_id
    orders = db.query(models.Order).filter(
        models.Order.restaurant_id == restaurant_id
    ).order_by(models.Order.created_at.desc()).limit(10).all()
    
    result = []
    for order in orders:
        result.append({
            "id": order.id,
            "customer": order.customer_name if order.customer_name != "Inconnu" else order.customer_phone,
            "items": order.items_description,
            "amount": order.total_amount,
            "status": order.status,
            "time": order.created_at.strftime("%H:%M") if order.created_at else ""
        })
    return result

@app.get("/api/orders")
def get_all_orders(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(database.get_db)):
    """Lister toutes les commandes du restaurant connecté"""
    restaurant_id = current_user.restaurant_id
    orders = db.query(models.Order).filter(
        models.Order.restaurant_id == restaurant_id
    ).order_by(models.Order.created_at.desc()).all()
    
    result = []
    for order in orders:
        result.append({
            "id": order.id,
            "customer": order.customer_name if order.customer_name != "Inconnu" else order.customer_phone,
            "customer_phone": order.customer_phone,
            "items": order.items_description,
            "amount": order.total_amount,
            "status": order.status,
            "source": order.source,
            "time": order.created_at.strftime("%d/%m %H:%M") if order.created_at else ""
        })
    return result

@app.get("/api/accounting/transactions")
def get_transactions(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(database.get_db)):
    """Lister toutes les transactions financières pour le grand livre"""
    restaurant_id = current_user.restaurant_id
    transactions = db.query(models.Transaction).filter(
        models.Transaction.restaurant_id == restaurant_id
    ).order_by(models.Transaction.created_at.desc()).all()
    
    result = []
    for tx in transactions:
        result.append({
            "id": tx.id,
            "amount": tx.amount,
            "type": tx.type,
            "description": tx.description,
            "order_id": tx.order_id,
            "time": tx.created_at.strftime("%d/%m %H:%M") if tx.created_at else ""
        })
    return result

@app.get("/api/accounting/summary")
def get_accounting_summary(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(database.get_db)):
    """Synthèse financière : Entrées, Sorties, Bénéfice Net, Marge"""
    restaurant_id = current_user.restaurant_id
    
    # Somme des ventes (income)
    total_income = db.query(models.Transaction).filter(
        models.Transaction.restaurant_id == restaurant_id,
        models.Transaction.type == "income"
    ).with_entities(models.func.sum(models.Transaction.amount)).scalar() or 0.0
    
    # Somme des dépenses (expense)
    total_expense = db.query(models.Transaction).filter(
        models.Transaction.restaurant_id == restaurant_id,
        models.Transaction.type == "expense"
    ).with_entities(models.func.sum(models.Transaction.amount)).scalar() or 0.0
    
    net_profit = total_income - total_expense
    profit_margin = (net_profit / total_income * 100) if total_income > 0 else 0.0
    
    return {
        "total_income": total_income,
        "total_expense": total_expense,
        "net_profit": net_profit,
        "profit_margin": round(profit_margin, 2)
    }


class AIQuerySchema(BaseModel):
    question: str

@app.post("/api/ai/query")
def query_ai_agent(payload: AIQuerySchema, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(database.get_db)):
    """Interroger l'agent IA de comptabilité avec le contexte réel de son restaurant"""
    restaurant = db.query(models.Restaurant).filter(models.Restaurant.id == current_user.restaurant_id).first()
    restaurant_name = restaurant.name if restaurant else "Mon Maquis"
    
    response_text = compta_agent.query_compta_agent(
        db=db,
        restaurant_id=current_user.restaurant_id,
        restaurant_name=restaurant_name,
        question=payload.question
    )
    return {"response": response_text}


@app.post("/api/accounting/transaction")
def add_transaction(amount: float, type: str, description: str, order_id: int = None, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(database.get_db)):
    """Ajouter une transaction manuellement (Dépense ou Vente sur place) pour son restaurant"""
    new_transaction = models.Transaction(
        amount=amount, 
        type=type, 
        description=description, 
        order_id=order_id,
        restaurant_id=current_user.restaurant_id
    )
    db.add(new_transaction)
    db.commit()
    db.refresh(new_transaction)
    return new_transaction

@app.post("/api/orders/{order_id}/status")
def update_order_status(order_id: int, status: str, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(database.get_db)):
    """Mettre à jour le statut d'une commande et comptabiliser la vente automatiquement si Livré"""
    order = db.query(models.Order).filter(
        models.Order.id == order_id,
        models.Order.restaurant_id == current_user.restaurant_id
    ).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Commande non trouvée")
        
    valid_statuses = ["Nouveau", "En préparation", "Prêt", "Livré", "Annulé"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Statut invalide")
        
    old_status = order.status
    order.status = status
    
    # Si le statut passe à "Livré", on crée automatiquement une transaction de vente !
    if status == "Livré" and old_status != "Livré":
        # Vérifier si une transaction n'a pas déjà été créée pour cette commande
        existing_tx = db.query(models.Transaction).filter(
            models.Transaction.order_id == order.id,
            models.Transaction.restaurant_id == current_user.restaurant_id
        ).first()
        
        if not existing_tx:
            new_tx = models.Transaction(
                amount=order.total_amount,
                type="income",
                description=f"Vente WhatsApp - Client: {order.customer_name if order.customer_name != 'Inconnu' else order.customer_phone} (Commande #{order.id})",
                order_id=order.id,
                restaurant_id=current_user.restaurant_id
            )
            db.add(new_tx)
            
    db.commit()
    db.refresh(order)
    return {"message": "Statut de la commande mis à jour avec succès !", "order_status": order.status}

# --- WEBHOOK WHATSAPP & INTEGRATION IA (ROUTAGE MULTI-TENANT) ---

def process_whatsapp_message(message_data: str, phone: str, receiver_phone: str, db: Session):
    print(f"[{phone}] Message entrant vers [{receiver_phone}]: {message_data}")
    
    # 1. Identifier le restaurant par le numéro de téléphone récepteur
    # En production, receiver_phone est le numéro WhatsApp Business du maquis.
    restaurant = db.query(models.Restaurant).filter(models.Restaurant.whatsapp_phone == receiver_phone).first()
    
    # Si non identifié, on cherche le premier restaurant de la base à titre de fallback pour les tests
    if not restaurant:
        restaurant = db.query(models.Restaurant).first()
        if not restaurant:
            print("Erreur: Aucun restaurant en base pour traiter la commande WhatsApp.")
            return

    # 2. Analyser avec Gemini IA
    ai_response = ai_agent.parse_whatsapp_message_with_ai(message_data)
    
    intent = ai_response.get("intent", "other")
    reply_msg = ai_response.get("reply_message", "Message bien reçu !")
    
    if intent == "order":
        items_str = ", ".join(ai_response.get("items", []))
        total = ai_response.get("total_estimated", 0)
        
        # 3. Créer la commande en rattachant le restaurant_id
        new_order = models.Order(
            customer_phone=phone,
            customer_name="Client WhatsApp",
            items_description=items_str,
            total_amount=total,
            source="whatsapp",
            status="Nouveau",
            restaurant_id=restaurant.id
        )
        db.add(new_order)
        db.commit()
        print(f"[{restaurant.name}] Nouvelle commande créée: {items_str} - {total} FCFA")
    else:
        print(f"[{restaurant.name}] Simple message/question: {reply_msg}")
        
    print(f"ENVOI WHATSAPP -> {phone}: {reply_msg}")

@app.post("/api/whatsapp/webhook")
def whatsapp_webhook(payload: Dict[Any, Any], background_tasks: BackgroundTasks, db: Session = Depends(database.get_db)):
    """Webhook WhatsApp. Il route les messages vers le bon maquis (Multi-Tenant)."""
    try:
        # payload types:
        # Twilio/Meta envoie typiquement 'To' (receiver) et 'From' (sender)
        message_body = payload.get("message", payload.get("Body", ""))
        sender_phone = payload.get("phone", payload.get("From", "00000000"))
        
        # Le numéro de réception (le numéro du maquis connecté)
        receiver_phone = payload.get("receiver_phone", payload.get("To", "default_whatsapp_phone"))
        
        background_tasks.add_task(process_whatsapp_message, message_body, sender_phone, receiver_phone, db)
        
        return {"status": "success", "message": "WhatsApp webhook successfully routed"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
