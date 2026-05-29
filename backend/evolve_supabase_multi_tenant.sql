-- =======================================================================
-- SCRIPT D'ÉVOLUTION MULTI-TENANT SAAS POUR SUPABASE
-- Ella's Fashion House & Plateforme Multi-Boutiques
-- =======================================================================
-- Ce script ajoute le partitionnement par boutique sans perte de données.
-- Vos 9 fiches de connaissances et commandes actuelles sont préservées !
-- =======================================================================

-- 1. Activer l'extension pgvector si elle n'est pas déjà présente
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Ajouter la colonne de partitionnement multi-tenant aux tables existantes
-- Ces colonnes contiendront NULL par défaut pour vos données actuelles.
-- Vous pourrez ensuite associer vos données existantes à la boutique Ella's Fashion.
ALTER TABLE documents ADD COLUMN IF NOT EXISTS restaurant_id INT;
ALTER TABLE commandes ADD COLUMN IF NOT EXISTS restaurant_id INT;

-- 3. Créer des index de performance pour accélérer les requêtes de filtrage par boutique
CREATE INDEX IF NOT EXISTS idx_documents_restaurant_id ON documents(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_commandes_restaurant_id ON commandes(restaurant_id);

-- 4. Surcharger la fonction match_documents pour inclure le filtre de boutique
-- Cette version prend 4 arguments et utilise la même logique performante "language sql stable"
-- que votre fonction à 3 arguments actuelle.
CREATE OR REPLACE FUNCTION match_documents (
  query_embedding vector(3072),
  match_threshold float,
  match_count int,
  filter_restaurant_id int
)
RETURNS TABLE (
  id bigint,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    documents.id,
    documents.content,
    documents.metadata,
    1 - (documents.embedding <=> query_embedding) AS similarity
  FROM documents
  WHERE (documents.restaurant_id = filter_restaurant_id OR documents.restaurant_id IS NULL)
    AND 1 - (documents.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
$$;

-- Note d'ingénierie : L'ajout de "OR documents.restaurant_id IS NULL" ci-dessus permet à vos
-- 9 documents actuels (qui n'ont pas encore d'ID de boutique associé) de rester visibles 
-- pour toutes les boutiques pendant vos phases de test de migration. Une fois vos données 
-- associées, vous pourrez enlever cette condition pour une isolation 100% stricte.
