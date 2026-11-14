-- Teranga Santé — rôle super administrateur (1/2)
-- À exécuter SEUL, avant 20261117000100_super_admin.sql : PostgreSQL n'autorise pas l'usage
-- d'une nouvelle valeur d'énumération dans la même transaction que sa création.
alter type public.pro_role add value if not exists 'super_admin';
