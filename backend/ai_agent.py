import os
import json
import google.generativeai as genai
from dotenv import load_dotenv
import urllib.request
import urllib.error

load_dotenv()

# Configurer l'API Key Gemini (à titre informatif)
# genai.configure(api_key=os.environ["GEMINI_API_KEY"])

SYSTEM_PROMPT = """
Tu es MaquisIA, un assistant virtuel intelligent pour un maquis / restaurant en Côte d'Ivoire.
Ton rôle est de lire les messages WhatsApp des clients (qui peuvent être en français standard, en nouchi, ou en français ivoirien) et d'en extraire les informations de commande.

Tu dois répondre UNIQUEMENT avec un objet JSON valide ayant la structure suivante :
{
    "intent": "order" | "question" | "other",
    "items": ["liste des plats ou boissons demandés"],
    "total_estimated": montant_en_nombre_entier,
    "reply_message": "Le message que tu envoies au client pour confirmer ou répondre (en langage familier ivoirien poli)"
}

Règles de tarification (pour l'estimation) :
- Garba simple: 1000 FCFA
- Garba complet (avec oeuf etc): 1500 FCFA
- Poulet braisé: 5000 FCFA
- Choukouya (mouton): 3000 FCFA la portion
- Poisson braisé: 6000 FCFA
- Bière (Bock, Drogba, 66cl): 1000 FCFA
- Sucrerie / Jus: 500 FCFA

Si le client pose une question (ex: "Vous êtes ouverts ?"), l'intent est "question" et items est vide.
Exemple d'input: "Chef pardon pardon envoie 2 garba complet et un bock bien tapé à Angré"
Exemple d'output JSON:
{
    "intent": "order",
    "items": ["2x Garba complet", "1x Bock 66cl"],
    "total_estimated": 4000,
    "reply_message": "C'est validé chef ! Ça fait 4000 FCFA pour les 2 garba et la bock. On t'envoie ça à Angré."
}
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
        "temperature": 0.2
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
        print(f"Groq API HTTP Error: {e.code} - {e.read().decode('utf-8')}")
        # Fallback automatique sur Llama3-8b si quota ou rate limit sur le 70b
        if model_name != "llama3-8b-8192":
            return query_groq_api(system_prompt, user_prompt, api_key, model_name="llama3-8b-8192")
        raise e
    except Exception as e:
        print(f"Error querying Groq: {e}")
        raise e

def parse_whatsapp_message_with_ai(message_text: str) -> dict:
    """
    Analyse le message du client et renvoie un dictionnaire structuré.
    """
    # 1. Utilisation de Groq si la clé est présente
    groq_api_key = os.environ.get("GROQ_API_KEY")
    if groq_api_key:
        try:
            print("Utilisation de Groq Llama 3 pour l'analyse WhatsApp...")
            raw_response = query_groq_api(SYSTEM_PROMPT, message_text, groq_api_key)
            
            # Nettoyer les balises Markdown si présentes
            raw_json = raw_response.strip()
            if raw_json.startswith('```json'):
                raw_json = raw_json[7:-3]
            elif raw_json.startswith('```'):
                raw_json = raw_json[3:-3]
                
            return json.loads(raw_json)
        except Exception as e:
            print(f"Erreur d'analyse WhatsApp avec Groq: {e}")

    # 2. Utilisation de Gemini si configuré
    gemini_api_key = os.environ.get("GEMINI_API_KEY")
    if gemini_api_key:
        try:
            print("Utilisation de Gemini pour l'analyse WhatsApp...")
            genai.configure(api_key=gemini_api_key)
            model = genai.GenerativeModel('gemini-2.5-flash', system_instruction=SYSTEM_PROMPT)
            response = model.generate_content(message_text)
            
            raw_json = response.text.strip()
            if raw_json.startswith('```json'):
                raw_json = raw_json[7:-3]
            elif raw_json.startswith('```'):
                raw_json = raw_json[3:-3]
                
            return json.loads(raw_json)
        except Exception as e:
            print(f"Erreur d'analyse WhatsApp avec Gemini: {e}")

    # 3. Fallback Simulation en local
    print("Avertissement: Aucune clé API configurée. Utilisation de la simulation locale.")
    return mock_ai_parsing(message_text)

def mock_ai_parsing(message: str) -> dict:
    """Simulation de l'IA pour les tests locaux sans clé API"""
    m = message.lower()
    plats_detectes = []
    total = 0
    
    if "garba" in m:
        plats_detectes.append("Garba complet")
        total += 1500
    if "poulet" in m:
        plats_detectes.append("Poulet braisé")
        total += 5000
    if "bock" in m or "drogba" in m:
        plats_detectes.append("Bière Bock 66cl")
        total += 1000
    if "foutou" in m:
        plats_detectes.append("Foutou Banane sauce graine")
        total += 2500
    if "choukouya" in m:
        plats_detectes.append("Choukouya de mouton")
        total += 3000
    if "poisson" in m:
        plats_detectes.append("Poisson braisé")
        total += 6000

    if plats_detectes:
        return {
            "intent": "order",
            "items": plats_detectes,
            "total_estimated": total,
            "reply_message": f"C'est pointé boss ! On prépare votre commande : {', '.join(plats_detectes)}. Ça fera un total de {total} FCFA."
        }
    else:
         return {
            "intent": "question",
            "items": [],
            "total_estimated": 0,
            "reply_message": "On est là, on est ouverts jusqu'à 23h ! Qu'est-ce que je vous sers aujourd'hui ? (Essayez de commander : Garba, Poulet, Foutou, Choukouya, Poisson ou Bock)"
        }
