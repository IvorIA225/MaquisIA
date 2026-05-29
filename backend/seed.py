import requests

BASE_URL = "http://127.0.0.1:8000"

print("Ajout de transactions manuelles...")
requests.post(f"{BASE_URL}/api/accounting/transaction?amount=15000&type=income&description=Vente+sur+place+Table+4")
requests.post(f"{BASE_URL}/api/accounting/transaction?amount=8500&type=income&description=Vente+sur+place+Table+1")
requests.post(f"{BASE_URL}/api/accounting/transaction?amount=50000&type=expense&description=Achat+poisson+march%C3%A9")

print("Simulation de messages WhatsApp (Webhook)...")
# Commande 1
requests.post(f"{BASE_URL}/api/whatsapp/webhook", json={
    "message": "Je veux 2 garba avec beaucoup de piment et 1 bock 66",
    "phone": "2250102030405"
})

# Commande 2
requests.post(f"{BASE_URL}/api/whatsapp/webhook", json={
    "message": "Faites moi une livraison de poulet braisé à Cocody Angré",
    "phone": "2250708091011"
})

print("Données de test insérées avec succès!")
