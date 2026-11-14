-- Données FICTIVES pour le prototype Hack4VIH.
insert into public.regions (id, name) values
  (1,'Dakar'),(2,'Thiès'),(3,'Diourbel'),(4,'Fatick'),(5,'Kaolack'),(6,'Kaffrine'),(7,'Saint-Louis'),
  (8,'Louga'),(9,'Matam'),(10,'Tambacounda'),(11,'Kédougou'),(12,'Kolda'),(13,'Sédhiou'),(14,'Ziguinchor')
on conflict do nothing;

insert into public.centres (id, name, region_id, district, address, lat, lng, is_free, is_confidential, opening_hours, services) values
  ('11111111-0000-0000-0000-000000000001','Centre Jeunes Teranga – Médina',1,'Dakar Centre','Rue 11 x 6, Médina',14.6823,-17.4470,true,true,'{"mon-fri":["08:00","18:00"],"sat":["09:00","13:00"]}','{screening,consultation,prep,selftest_pickup}'),
  ('11111111-0000-0000-0000-000000000002','Espace Santé Pikine',1,'Pikine','Marché Zinc, Pikine',14.7545,-17.3906,true,true,'{"mon-fri":["08:00","17:00"]}','{screening,counselling,selftest_pickup}'),
  ('11111111-0000-0000-0000-000000000003','Point Écoute Thiès',2,'Thiès Nord','Avenue Lamine Guèye',14.7910,-16.9359,true,true,'{"mon-fri":["09:00","17:00"]}','{screening,consultation}'),
  ('11111111-0000-0000-0000-000000000004','Centre Ado Ziguinchor',14,'Ziguinchor','Quartier Boucotte',12.5681,-16.2719,true,true,'{"mon-fri":["08:30","16:30"]}','{screening,prep}')
on conflict do nothing;

-- (la colonne capacity est ajoutée par la migration admin)
insert into public.stocks (centre_id, item, level, threshold, capacity) values
  ('11111111-0000-0000-0000-000000000001','selftest',85,15,100),('11111111-0000-0000-0000-000000000001','condom',300,100,500),
  ('11111111-0000-0000-0000-000000000001','arv',18,20,40),('11111111-0000-0000-0000-000000000001','prep',90,10,100)
on conflict do nothing;

-- Créneaux des 7 prochains jours (Médina et Pikine), 9h–16h, toutes les heures.
insert into public.slots (centre_id, service, starts_at, ends_at, capacity)
select c.id, 'screening', d + make_interval(hours => h), d + make_interval(hours => h, mins => 45), 2
from (values ('11111111-0000-0000-0000-000000000001'::uuid), ('11111111-0000-0000-0000-000000000002'::uuid)) as c(id),
     generate_series(date_trunc('day', now()) + interval '1 day', date_trunc('day', now()) + interval '7 days', interval '1 day') as d,
     generate_series(9, 16) as h
where extract(isodow from d) < 7;

insert into public.quiz_questions (statement, answer, explanation, topic, published) values
  ('{"fr": "On peut se sentir bien sans se faire dépister."}', true, '{"fr": "Vrai ! On peut vivre avec le VIH pendant des années sans aucun signe. Seul un test permet de savoir."}', 'dépistage', true),
  ('{"fr": "On peut attraper le VIH en partageant un repas."}', false, '{"fr": "Faux ! Le VIH ne se transmet ni par la nourriture, ni par les bisous, ni par les moustiques."}', 'transmission', true),
  ('{"fr": "Le dépistage est confidentiel dans les centres partenaires."}', true, '{"fr": "Vrai ! Personne ne connaîtra ton résultat sans ton accord."}', 'dépistage', true),
  ('{"fr": "Une personne sous traitement avec une charge virale indétectable ne transmet pas le VIH par voie sexuelle."}', true, '{"fr": "Vrai ! Indétectable = Intransmissible (I = I)."}', 'traitement', true),
  ('{"fr": "La PrEP est un vaccin contre le VIH."}', false, '{"fr": "Faux. La PrEP est un médicament préventif à prendre comme prescrit, ce n''est pas un vaccin."}', 'prep', true),
  ('{"fr": "Le préservatif protège du VIH et de la plupart des IST."}', true, '{"fr": "Vrai ! Bien utilisé à chaque rapport, il protège efficacement."}', 'prévention', true),
  ('{"fr": "On peut savoir si quelqu''un a le VIH juste en le regardant."}', false, '{"fr": "Faux ! Le VIH ne se voit pas. Seul un test peut le dire."}', 'transmission', true);

insert into public.chatbot_nodes (id, message, options) values
  ('root', '{"fr": "Tu as une question ? Je suis là pour toi, sans jugement ! 💚"}', '[{"label": {"fr": "Comment me protéger ?"}, "next": "proteger"}, {"label": {"fr": "Où me faire dépister ?"}, "next": "depister"}, {"label": {"fr": "Et si je suis positif ?"}, "next": "positif"}, {"label": {"fr": "Parler à une infirmière"}, "route": "/discussion"}]'),
  ('proteger', '{"fr": "Pour te protéger : le préservatif à chaque rapport, la PrEP si tu es plus exposé·e, et un dépistage régulier. Une infirmière peut t''aider à choisir."}', '[{"label": {"fr": "C''est quoi la PrEP ?"}, "next": "prep"}, {"label": {"fr": "Parler à une infirmière"}, "route": "/discussion"}, {"label": {"fr": "Autre question"}, "next": "root"}]'),
  ('prep', '{"fr": "La PrEP est un médicament qui protège du VIH avant une exposition. Elle se prend sur prescription, avec un suivi en centre."}', '[{"label": {"fr": "Trouver un centre"}, "route": "/carte"}, {"label": {"fr": "Autre question"}, "next": "root"}]'),
  ('depister', '{"fr": "Tu peux te faire dépister dans un centre, de façon confidentielle. Réserve un créneau avec un code, sans donner ton nom."}', '[{"label": {"fr": "Voir les centres"}, "route": "/carte"}, {"label": {"fr": "Faire un autotest"}, "next": "autotest"}, {"label": {"fr": "Autre question"}, "next": "root"}]'),
  ('autotest', '{"fr": "Un autotest se fait chez toi en quelques minutes. Tu peux en récupérer un dans un centre partenaire. Si le résultat est positif, il faut le confirmer en centre."}', '[{"label": {"fr": "Trouver un centre"}, "route": "/carte"}, {"label": {"fr": "Autre question"}, "next": "root"}]'),
  ('positif', '{"fr": "Tu n''es pas seul·e. Un traitement efficace existe : bien suivi, il permet de vivre longtemps et en bonne santé. Une infirmière peut t''accompagner dès maintenant."}', '[{"label": {"fr": "Parler à une infirmière"}, "route": "/discussion"}, {"label": {"fr": "Autre question"}, "next": "root"}]')
on conflict (id) do update set message = excluded.message, options = excluded.options;

-- Les comptes infirmières/admins se créent dans Auth (Dashboard > Authentication > Add user),
-- puis : insert into public.pros (id, role, centre_id, display_name, specialty, languages, status)
--        values ('<uuid du user>', 'nurse', '11111111-0000-0000-0000-000000000001', 'Awa', 'Dépistage & PrEP', '{fr,wo}', 'online');
