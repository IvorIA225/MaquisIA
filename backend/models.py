from sqlalchemy import Boolean, Column, Integer, String, Float, DateTime, ForeignKey, Text, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base

class Restaurant(Base):
    __tablename__ = "restaurants"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    whatsapp_phone = Column(String, nullable=True, unique=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    users = relationship("User", back_populates="restaurant")
    orders = relationship("Order", back_populates="restaurant")
    transactions = relationship("Transaction", back_populates="restaurant")
    documents = relationship("Document", back_populates="restaurant")

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    restaurant_id = Column(Integer, ForeignKey("restaurants.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    restaurant = relationship("Restaurant", back_populates="users")

class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    customer_phone = Column(String, index=True)
    customer_name = Column(String, default="Inconnu")
    items_description = Column(String)  # Ex: "2x Poulet, 1x Bock"
    total_amount = Column(Float, default=0.0)
    status = Column(String, default="Nouveau") # Nouveau, En préparation, Prêt, Livré, Annulé
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    source = Column(String, default="whatsapp") # whatsapp, sur_place
    
    restaurant_id = Column(Integer, ForeignKey("restaurants.id"), nullable=True) # nullable=True pour le dev/simulation
    restaurant = relationship("Restaurant", back_populates="orders")

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    amount = Column(Float)
    type = Column(String) # "income" (vente) ou "expense" (dépense)
    description = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    order_id = Column(Integer, nullable=True) # Lié à une commande si c'est une vente
    
    restaurant_id = Column(Integer, ForeignKey("restaurants.id"), nullable=True)
    restaurant = relationship("Restaurant", back_populates="transactions")

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text, nullable=False)
    doc_metadata = Column(JSON, nullable=True) # Mappe jsonb dans PostgreSQL
    restaurant_id = Column(Integer, ForeignKey("restaurants.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    restaurant = relationship("Restaurant", back_populates="documents")

