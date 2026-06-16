-- Script SQL pour créer la base de données BlockTask manuellement
-- À exécuter dans pgAdmin ou psql avec les droits admin

-- 1. Créer l'utilisateur (si n'existe pas)
CREATE USER blocktask_user WITH 
    PASSWORD 'blocktask_password'
    CREATEDB
    LOGIN;

-- 2. Créer la base de données
CREATE DATABASE blocktask 
    OWNER blocktask_user
    ENCODING 'UTF8'
    LC_COLLATE 'en_US.UTF-8'
    LC_CTYPE 'en_US.UTF-8';

-- 3. Accorder les privilèges
GRANT ALL PRIVILEGES ON DATABASE blocktask TO blocktask_user;

-- 4. Se connecter à la base blocktask et accorder les privilèges sur le schéma public
\c blocktask;
GRANT ALL ON SCHEMA public TO blocktask_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO blocktask_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO blocktask_user;

-- Vérification
\du blocktask_user
\l blocktask
