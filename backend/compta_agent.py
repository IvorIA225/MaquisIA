import os
import json
import google.generativeai as genai
from sqlalchemy.orm import Session
from backend import models
from datetime import datetime, date
import urllib.request
import urllib.error

SYSTEM_PROMPT = """
Tu es MaquisIA, l'assistant expert-comptable personnel du gérant de maquis / restaurant en Côte d'Ivoire.
Ton rôle est d'analyser en temps réel les données financières et opérationnelles du restaurant et de répondre de manière précise et constructive aux questions du gérant (Patron).

Règles de comportement :
1. Sois poli, encourageant et professionnel. Utilise un ton chaleureux ivoirien (Nouchi amical et respectueux : appelle-le 'Patron' ou 'Vieux père').
2. Base-toi UNIQUEMENT sur les données réelles fournies dans le contexte ci-dessous. N'invente aucun chiffre.
3. Si le gérant te demande de faire un calcul (ex: bénéfice net ou marge), fais-le et montre-lui les détails du calcul.
4. Donne des conseils pratiques pour optimiser les ventes ou réduire les dépenses si tu remarques des déséquilibres (ex: dépenses de charbon trop élevées par rapport au CA).
"""

def query_groq_api(system_prompt: str, user_prompt: str, api_key: str, model_name: str = "llama-3.3-70b-versatile") -> str:
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    data = {
        "model": model_name,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "temperature": 0.5
    }
    
    req = urllib.request.Request(
        url, 
        data=json.dumps(data).encode("utf-8"), 
        headers=headers, 
        method="POST"
    )
    
    try:
        with urllib.request.urlopen(req) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            return res_data["choices"][0]["message"]["content"]
    except urllib.error.HTTPError as e:
        print(f"Groq API HTTP Error in compta_agent: {e.code} - {e.read().decode('utf-8')}")
        if model_name != "llama3-8b-8192":
            return query_groq_api(system_prompt, user_prompt, api_key, model_name="llama3-8b-8192")
        raise e
    except Exception as e:
        print(f"Error querying Groq in compta_agent: {e}")
        raise e

def query_compta_agent(db: Session, restaurant_id: int, restaurant_name: str, question: str) -> str:
    # 1. Extraire les statistiques financières de la base de données
    today = date.today()
    
    # Chiffre d'affaires du jour
    daily_sales = db.query(models.Transaction).filter(
        models.Transaction.restaurant_id == restaurant_id,
        models.Transaction.type == "income",
        models.Transaction.created_at >= datetime.combine(today, datetime.min.time())
    ).with_entities(models.func.sum(models.Transaction.amount)).scalar() or 0.0

    # Total des ventes (all time)
    total_income = db.query(models.Transaction).filter(
        models.Transaction.restaurant_id == restaurant_id,
        models.Transaction.type == "income"
    ).with_entities(models.func.sum(models.Transaction.amount)).scalar() or 0.0

    # Total des dépenses (all time)
    total_expense = db.query(models.Transaction).filter(
        models.Transaction.restaurant_id == restaurant_id,
        models.Transaction.type == "expense"
    ).with_entities(models.func.sum(models.Transaction.amount)).scalar() or 0.0
    
    net_profit = total_income - total_expense
    profit_margin = round((net_profit / total_income * 100), 2) if total_income > 0 else 0.0

    # Liste des 20 dernières transactions
    transactions = db.query(models.Transaction).filter(
        models.Transaction.restaurant_id == restaurant_id
    ).order_by(models.Transaction.created_at.desc()).limit(20).all()
    
    tx_list = []
    for tx in transactions:
        tx_list.append({
            "type": "vente (income)" if tx.type == "income" else "dépense (expense)",
            "montant": tx.amount,
            "description": tx.description,
            "date": tx.created_at.strftime("%d/%m/%Y %H:%M") if tx.created_at else ""
        })

    # Liste des 20 dernières commandes
    orders = db.query(models.Order).filter(
        models.Order.restaurant_id == restaurant_id
    ).order_by(models.Order.created_at.desc()).limit(20).all()
    
    order_list = []
    for o in orders:
        order_list.append({
            "id": o.id,
            "client": o.customer_name if o.customer_name != "Inconnu" else o.customer_phone,
            "plats": o.items_description,
            "montant": o.total_amount,
            "status": o.status,
            "date": o.created_at.strftime("%d/%m/%Y %H:%M") if o.created_at else ""
        })

    # Construire le bloc de contexte pour l'IA
    context = {
        "restaurant_name": restaurant_name,
        "date_du_jour": today.strftime("%d/%m/%Y"),
        "chiffre_affaires_aujourdhui": daily_sales,
        "chiffre_affaires_cumule": total_income,
        "dépenses_cumulées": total_expense,
        "bénéfice_net": net_profit,
        "marge_bénéficiaire_pourcentage": profit_margin,
        "dernieres_transactions": tx_list,
        "dernieres_commandes": order_list
    }

    # 1. Tenter d'utiliser Groq si la clé est configurée
    groq_api_key = os.environ.get("GROQ_API_KEY")
    if groq_api_key:
        try:
            print("Utilisation de Groq Llama 3 pour l'analyse Comptable conversationnelle...")
            prompt = f"""
            Voici le contexte en temps réel des données comptables de notre restaurant :
            {context}

            Question du gérant :
            "{question}"
            """
            return query_groq_api(SYSTEM_PROMPT, prompt, groq_api_key)
        except Exception as e:
            print(f"Erreur avec Groq Cloud dans compta_agent: {e}")

    # 2. Utiliser Gemini si configuré
    gemini_api_key = os.environ.get("GEMINI_API_KEY")
    if gemini_api_key:
        try:
            print("Utilisation de Gemini pour l'analyse Comptable conversationnelle...")
            genai.configure(api_key=gemini_api_key)
            model = genai.GenerativeModel('gemini-2.5-flash', system_instruction=SYSTEM_PROMPT)
            
            prompt = f"""
            Voici le contexte en temps réel des données comptables de notre restaurant :
            {context}

            Question du gérant :
            "{question}"
            """
            response = model.generate_content(prompt)
            return response.text.strip()
        except Exception as e:
            print(f"Erreur avec Gemini dans compta_agent: {e}")

    # 3. Fallback Simulation en local
    print("Avertissement: Aucune clé API configurée pour l'assistant. Utilisation du mock.")
    return mock_agent_response(question, context)

def mock_agent_response(question: str, context: dict) -> str:
    """Simulation de l'expert comptable IA si aucune clé API n'est disponible"""
    q = question.lower()
    name = context["restaurant_name"]
    ca_today = context["chiffre_affaires_aujourdhui"]
    ca_total = context["chiffre_affaires_cumule"]
    expenses = context["dépenses_cumulées"]
    profit = context["bénéfice_net"]
    margin = context["marge_bénéficiaire_pourcentage"]
    
    if "résumé" in q or "journée" in q or "jour" in q:
        return f"Salut Patron ! Voici le point de la journée pour **{name}** : Aujourd'hui, on a fait un chiffre d'affaires de **{ca_today:,} FCFA** sur place et via WhatsApp. Sur toute la période, nos ventes cumulées sont de **{ca_total:,} FCFA** pour **{expenses:,} FCFA** de dépenses, ce qui nous laisse un bénéfice net de **{profit:,} FCFA** (avec une belle marge de **{margin}%**). C'est du solide, vieux père ! On continue comme ça !"
        
    elif "dépense" in q or "perte" in q or "argent" in q or "sorti" in q:
        txs = context["dernieres_transactions"]
        expenses_details = [f"- {tx['description']} ({tx['montant']:,} FCFA)" for tx in txs if "dépense" in tx["type"]]
        details_str = "\n".join(expenses_details) if expenses_details else "Aucune dépense enregistrée pour le moment, Patron ! Tout va bien."
        return f"Patron, sur la période, on a sorti un total de **{expenses:,} FCFA**. Voici le détail de nos dernières dépenses :\n{details_str}\n\nMon conseil : surveillons de près les petits achats quotidiens, c'est là que l'argent s'en va sans faire de bruit !"
        
    elif "bénéfice" in q or "marge" in q or "gain" in q or "profit" in q:
        status = "On est dans le vert !" if profit >= 0 else "Aïe, patron, on est en déficit, il faut augmenter les ventes !"
        return f"Pour la comptabilité de **{name}**, c'est très clair :\n- **Ventes** : {ca_total:,} FCFA\n- **Dépenses** : {expenses:,} FCFA\n- **Bénéfice Net** : **{profit:,} FCFA**\n- **Marge** : **{margin}%**\n\n{status} Si tu veux booster la marge, je te conseille de mettre en avant nos plats phares comme le Poulet Braisé ou d'ajuster le prix des boissons !"
        
    else:
        return f"Je suis là pour toi, Patron ! Tes données pour **{name}** sont chargées en direct :\n- Ventes aujourd'hui : **{ca_today:,} FCFA**\n- Bénéfice total : **{profit:,} FCFA**\n- Marge : **{margin}%**\n\nPose-moi une question précise sur les ventes, les dépenses ou demande-moi un résumé de ta journée, et je te fais le point carré !"
