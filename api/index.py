import os
import sys

# Ajouter le dossier 'backend' au PYTHONPATH pour que Vercel trouve les modules
backend_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend")
sys.path.insert(0, backend_path)

from main import app
