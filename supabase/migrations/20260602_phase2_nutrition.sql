-- ============================================================
-- Phase 2: Nutrition — foods, meal_logs, nutrition_profile
-- Source: CIQUAL 2020 (French food composition database) +
--         USDA FoodData Central. Values per 100 g (approximate).
-- ============================================================

-- ── foods ────────────────────────────────────────────────────
create table if not exists foods (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references auth.users(id) on delete cascade,
  name              text not null,
  aliases           jsonb default '[]'::jsonb,
  calories_per_100g numeric not null,
  protein_g         numeric default 0,
  carbs_g           numeric default 0,
  fat_g             numeric default 0,
  fiber_g           numeric default 0,
  default_portion_g numeric default 100,
  is_custom         boolean default false,
  created_at        timestamptz default now()
);
alter table foods enable row level security;

create policy "foods_select" on foods
  for select using (user_id is null or auth.uid() = user_id);
create policy "foods_insert" on foods
  for insert with check (auth.uid() = user_id);
create policy "foods_update" on foods
  for update using (auth.uid() = user_id);
create policy "foods_delete" on foods
  for delete using (auth.uid() = user_id);

-- ── meal_logs ─────────────────────────────────────────────────
create table if not exists meal_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  date        date not null,
  meal_type   text not null check (meal_type in ('breakfast','lunch','dinner','snacks')),
  food_id     uuid references foods(id) on delete set null,
  custom_name text,
  quantity_g  numeric not null,
  calories    numeric not null,
  protein_g   numeric default 0,
  carbs_g     numeric default 0,
  fat_g       numeric default 0,
  fiber_g     numeric default 0,
  notes       text,
  created_at  timestamptz default now()
);
alter table meal_logs enable row level security;

create policy "meal_logs_select" on meal_logs
  for select using (auth.uid() = user_id);
create policy "meal_logs_insert" on meal_logs
  for insert with check (auth.uid() = user_id);
create policy "meal_logs_update" on meal_logs
  for update using (auth.uid() = user_id);
create policy "meal_logs_delete" on meal_logs
  for delete using (auth.uid() = user_id);

-- ── nutrition_profile ─────────────────────────────────────────
create table if not exists nutrition_profile (
  user_id          uuid primary key references auth.users(id) on delete cascade,
  weight_kg        numeric,
  height_cm        numeric,
  age              int,
  sex              text check (sex in ('male','female','other')),
  activity_level   text default 'moderate'
                   check (activity_level in ('sedentary','light','moderate','active','very_active')),
  goal             text default 'maintain'
                   check (goal in ('lose','maintain','gain')),
  protein_target_g numeric,
  carbs_target_g   numeric,
  fat_target_g     numeric,
  updated_at       timestamptz default now()
);
alter table nutrition_profile enable row level security;

create policy "nutrition_profile_select" on nutrition_profile
  for select using (auth.uid() = user_id);
create policy "nutrition_profile_insert" on nutrition_profile
  for insert with check (auth.uid() = user_id);
create policy "nutrition_profile_update" on nutrition_profile
  for update using (auth.uid() = user_id);
create policy "nutrition_profile_delete" on nutrition_profile
  for delete using (auth.uid() = user_id);

-- ── Seed foods (~140 common French/international foods) ───────
-- All have user_id = NULL (global, visible to all users).
-- Values per 100 g unless noted. Source: CIQUAL 2020 + USDA.

insert into foods (user_id, name, aliases, calories_per_100g, protein_g, carbs_g, fat_g, fiber_g, default_portion_g, is_custom) values

-- ── PAINS & CÉRÉALES ──────────────────────────────────────────
(null, 'Pain blanc',            '["white bread","pain de mie blanc"]',     265, 8.5,  50.4, 3.2,  2.8,  50, false),
(null, 'Baguette',              '["baguette tradition","french baguette"]', 278, 9.5,  55.1, 1.2,  2.3,  50, false),
(null, 'Pain complet',          '["whole wheat bread","pain intégral"]',    247, 9.3,  44.7, 3.0,  6.8,  50, false),
(null, 'Pain de mie',           '["sandwich bread","toast"]',               264, 8.4,  50.5, 3.2,  2.5,  30, false),
(null, 'Pain de seigle',        '["rye bread","pain au seigle"]',           259, 8.5,  47.8, 3.3,  6.2,  50, false),
(null, 'Biscottes',             '["rusk","crackers biscottes"]',            394, 11.0, 72.0, 7.0,  5.0,  10, false),
(null, 'Riz blanc cuit',        '["cooked white rice","riz cuit"]',         130, 2.7,  28.7, 0.3,  0.4, 180, false),
(null, 'Riz complet cuit',      '["brown rice cooked","riz brun"]',         123, 2.7,  25.6, 1.0,  1.8, 180, false),
(null, 'Riz basmati cuit',      '["basmati rice","riz basmati"]',           130, 3.2,  27.5, 0.3,  0.5, 180, false),
(null, 'Pâtes cuites',          '["pasta cooked","spaghetti cuits","macaroni"]', 157, 5.8, 30.9, 0.9, 1.8, 200, false),
(null, 'Quinoa cuit',           '["quinoa cooked","quinoa"]',               120, 4.4,  21.3, 1.9,  2.8, 180, false),
(null, 'Semoule cuite',         '["couscous cuit","semolina cooked"]',      136, 4.6,  27.6, 0.7,  1.5, 180, false),
(null, 'Avoine flocons',        '["oatmeal","porridge","rolled oats"]',     379, 13.2, 62.6, 7.5,  9.5,  50, false),
(null, 'Muesli',                '["granola muesli","bircher"]',             366, 10.0, 59.0, 9.0,  6.5,  50, false),
(null, 'Corn flakes',           '["céréales corn flakes","kelloggs"]',      378, 7.5,  84.0, 1.0,  3.0,  40, false),
(null, 'Granola',               '["granola céréales"]',                     471, 9.0,  57.0, 22.0, 5.0,  45, false),
(null, 'Polenta cuite',         '["cornmeal cooked","polenta"]',             70, 1.7,  15.0, 0.5,  1.0, 200, false),

-- ── LÉGUMINEUSES ──────────────────────────────────────────────
(null, 'Lentilles cuites',      '["lentils cooked","lentilles vertes"]',    116, 9.0,  20.1, 0.4,  7.9, 180, false),
(null, 'Pois chiches cuits',    '["chickpeas cooked","pois chiches"]',      164, 8.9,  27.4, 2.6,  7.6, 180, false),
(null, 'Haricots blancs cuits', '["white beans cooked","cocos"]',           139, 9.7,  25.4, 0.5,  7.4, 180, false),
(null, 'Haricots rouges cuits', '["kidney beans cooked","haricots rouges"]',127, 8.7,  22.8, 0.5,  6.4, 180, false),
(null, 'Tofu ferme',            '["tofu firm","tofu"]',                      76, 8.1,   1.9, 4.2,  0.3, 150, false),
(null, 'Edamame',               '["edamame","soya beans"]',                 122, 11.9,  8.5, 5.2,  5.2, 150, false),
(null, 'Fèves cuites',          '["broad beans","feves"]',                   88, 7.5,  15.6, 0.5,  5.8, 150, false),

-- ── VIANDES ───────────────────────────────────────────────────
(null, 'Poulet grillé',         '["chicken breast grilled","blanc de poulet"]', 165, 31.0, 0.0,  3.6, 0.0, 150, false),
(null, 'Dinde grillée',         '["turkey breast","dinde"]',               135, 29.9,  0.0,  1.6, 0.0, 150, false),
(null, 'Bœuf haché 5% MG',      '["lean ground beef","boeuf maigre"]',     137, 21.4,  0.0,  5.5, 0.0, 150, false),
(null, 'Bœuf haché 15% MG',     '["ground beef 15%","boeuf haché"]',       199, 19.4,  0.0, 13.1, 0.0, 150, false),
(null, 'Steak bœuf',            '["beef steak","entrecôte","bavette"]',     217, 26.0,  0.0, 12.0, 0.0, 150, false),
(null, 'Filet mignon porc',     '["pork tenderloin","filet porc"]',         143, 22.2,  0.0,  5.7, 0.0, 150, false),
(null, 'Côtelette agneau',      '["lamb chop","côtelette agneau"]',         270, 24.5,  0.0, 18.5, 0.0, 150, false),
(null, 'Jambon blanc',          '["cooked ham","jambon cuit"]',             106, 14.5,  1.0,  4.9, 0.0,  50, false),
(null, 'Jambon cru',            '["cured ham","prosciutto","serrano"]',     230, 22.0,  0.0, 15.5, 0.0,  30, false),
(null, 'Bacon',                 '["lardons","bacon grillé"]',               541, 37.0,  0.0, 42.0, 0.0,  30, false),
(null, 'Lardons fumés',         '["smoked lardons","lardons nature"]',      392, 16.5,  0.0, 36.0, 0.0,  30, false),
(null, 'Saucisse porc',         '["pork sausage","saucisse de porc"]',      339, 13.5,  2.5, 31.0, 0.0,  80, false),
(null, 'Chipolata',             '["chipolata sausage"]',                    298, 14.8,  1.2, 26.0, 0.0,  60, false),
(null, 'Merguez',               '["merguez sausage"]',                      287, 15.0,  1.5, 25.0, 0.0,  80, false),

-- ── POISSONS & FRUITS DE MER ──────────────────────────────────
(null, 'Saumon grillé',         '["salmon grilled","saumon atlantique"]',   206, 28.2,  0.0, 10.5, 0.0, 150, false),
(null, 'Thon en boîte',         '["canned tuna","thon naturel"]',           116, 26.0,  0.0,  0.8, 0.0, 100, false),
(null, 'Cabillaud grillé',      '["cod grilled","morue"]',                   82, 18.9,  0.0,  0.7, 0.0, 150, false),
(null, 'Sole grillée',          '["sole grilled","filet de sole"]',          86, 18.0,  0.0,  1.5, 0.0, 150, false),
(null, 'Sardine en boîte',      '["canned sardines","sardines à huile"]',   208, 24.6,  0.0, 11.5, 0.0,  85, false),
(null, 'Maquereau grillé',      '["mackerel grilled","maquereau"]',         239, 23.9,  0.0, 15.5, 0.0, 150, false),
(null, 'Crevettes cuites',      '["shrimp cooked","gambas"]',                99, 20.9,  0.0,  1.1, 0.0, 100, false),
(null, 'Moules cuites',         '["mussels cooked","moules"]',               86, 11.9,  3.7,  2.2, 0.0, 200, false),
(null, 'Truite grillée',        '["trout grilled","truite saumonée"]',      149, 22.5,  0.0,  6.1, 0.0, 150, false),

-- ── ŒUFS & PRODUITS LAITIERS ──────────────────────────────────
(null, 'Œuf entier',            '["whole egg","oeuf"]',                     155, 13.0,  1.1, 11.0, 0.0,  55, false),
(null, 'Blanc d''œuf',          '["egg white","blanc d oeuf"]',              52, 10.9,  0.7,  0.2, 0.0,  30, false),
(null, 'Lait demi-écrémé',      '["semi-skimmed milk","lait 1.5%"]',         46,  3.2,  4.8,  1.5, 0.0, 250, false),
(null, 'Lait entier',           '["whole milk","lait entier"]',              65,  3.3,  4.8,  3.6, 0.0, 250, false),
(null, 'Yaourt nature',         '["plain yogurt","yaourt"]',                 56,  3.9,  4.7,  1.5, 0.0, 125, false),
(null, 'Yaourt grec',           '["greek yogurt","yaourt grec 0%"]',        100,  9.0,  4.0,  5.0, 0.0, 150, false),
(null, 'Fromage blanc 0%',      '["quark 0%","fromage blanc maigre"]',       45,  7.5,  4.4,  0.1, 0.0, 150, false),
(null, 'Skyr nature',           '["skyr","icelandic yogurt"]',               65, 11.0,  4.0,  0.2, 0.0, 150, false),
(null, 'Cottage cheese',        '["cottage cheese","fromage cottage"]',      98, 11.1,  3.4,  4.3, 0.0, 150, false),
(null, 'Gruyère',               '["gruyere","gruyère râpé"]',               413, 29.0,  0.4, 32.3, 0.0,  30, false),
(null, 'Emmental',              '["emmental râpé","swiss cheese"]',         379, 27.0,  0.5, 29.5, 0.0,  30, false),
(null, 'Brie',                  '["brie de meaux","brie cheese"]',          334, 20.0,  0.0, 28.4, 0.0,  40, false),
(null, 'Camembert',             '["camembert de normandie"]',               299, 20.0,  0.5, 23.5, 0.0,  40, false),
(null, 'Mozzarella',            '["mozzarella di bufala","mozzarella"]',    280, 18.5,  2.2, 22.0, 0.0,  60, false),
(null, 'Ricotta',               '["ricotta cheese"]',                       174,  9.0,  2.8, 13.8, 0.0, 100, false),
(null, 'Crème fraîche épaisse', '["heavy cream","crème entière"]',          292,  2.2,  3.0, 30.0, 0.0,  30, false),
(null, 'Beurre',                '["butter","beurre doux"]',                 745,  0.7,  0.6, 82.5, 0.0,  10, false),

-- ── FRUITS ────────────────────────────────────────────────────
(null, 'Pomme',                 '["apple","pomme golden"]',                  52,  0.3, 13.8,  0.2, 2.4, 150, false),
(null, 'Banane',                '["banana","banane mûre"]',                  89,  1.1, 22.8,  0.3, 2.6, 120, false),
(null, 'Orange',                '["orange","clémentine"]',                   47,  0.9, 11.8,  0.1, 2.4, 180, false),
(null, 'Fraise',                '["strawberry","fraises"]',                  32,  0.7,  7.7,  0.3, 2.0, 150, false),
(null, 'Raisin',                '["grapes","raisins frais"]',                69,  0.7, 18.1,  0.2, 0.9, 150, false),
(null, 'Kiwi',                  '["kiwi fruit"]',                            61,  1.1, 14.7,  0.5, 3.0, 100, false),
(null, 'Pêche',                 '["peach","nectarine"]',                     42,  1.0, 10.0,  0.3, 1.5, 150, false),
(null, 'Poire',                 '["pear","poire williams"]',                 58,  0.4, 15.5,  0.1, 3.1, 160, false),
(null, 'Mangue',                '["mango","mangue"]',                        65,  0.8, 17.0,  0.4, 1.8, 200, false),
(null, 'Ananas',                '["pineapple","ananas frais"]',              50,  0.5, 13.1,  0.1, 1.4, 200, false),
(null, 'Melon',                 '["cantaloupe","melon charentais"]',         34,  0.8,  8.2,  0.2, 0.9, 200, false),
(null, 'Pastèque',              '["watermelon","pastèque"]',                 30,  0.6,  7.6,  0.2, 0.4, 300, false),
(null, 'Cerise',                '["cherries","cerises"]',                    63,  1.1, 16.0,  0.2, 2.1, 100, false),
(null, 'Abricot',               '["apricot","abricots frais"]',              48,  1.4, 11.1,  0.4, 2.0, 100, false),
(null, 'Myrtille',              '["blueberry","myrtilles"]',                 57,  0.7, 14.5,  0.3, 2.4, 100, false),
(null, 'Framboise',             '["raspberries","framboises"]',              52,  1.2, 11.9,  0.7, 6.5, 100, false),

-- ── LÉGUMES ───────────────────────────────────────────────────
(null, 'Brocoli cuit',          '["broccoli cooked","brocoli"]',             35,  2.4,  7.2,  0.4, 3.3, 200, false),
(null, 'Épinards cuits',        '["cooked spinach","épinards"]',             23,  2.9,  3.6,  0.4, 2.2, 200, false),
(null, 'Salade verte',          '["green salad","laitue","roquette"]',        17,  1.4,  2.9,  0.3, 2.1, 100, false),
(null, 'Carotte crue',          '["raw carrot","carottes"]',                  41,  0.9,  9.6,  0.2, 2.8, 120, false),
(null, 'Tomate',                '["tomato","tomates cerises"]',               18,  0.9,  3.9,  0.2, 1.2, 150, false),
(null, 'Concombre',             '["cucumber","concombre"]',                   16,  0.7,  3.6,  0.1, 0.5, 200, false),
(null, 'Poivron rouge',         '["red pepper","poivron"]',                   31,  1.0,  7.3,  0.3, 2.1, 150, false),
(null, 'Poivron vert',          '["green pepper","poivron vert"]',            20,  0.9,  4.6,  0.2, 1.7, 150, false),
(null, 'Courgette cuite',       '["courgette cooked","zucchini"]',            17,  1.2,  3.5,  0.3, 1.0, 200, false),
(null, 'Haricots verts cuits',  '["green beans cooked","haricots verts"]',    31,  2.0,  6.9,  0.2, 3.4, 200, false),
(null, 'Champignons de Paris',  '["mushrooms","champignons"]',                22,  3.1,  3.3,  0.3, 1.0, 100, false),
(null, 'Oignon',                '["onion","oignon cru"]',                     40,  1.1,  9.3,  0.1, 1.7, 100, false),
(null, 'Chou-fleur cuit',       '["cauliflower cooked","chou-fleur"]',        25,  1.9,  4.9,  0.3, 2.0, 200, false),
(null, 'Asperge cuite',         '["asparagus cooked","asperges"]',            22,  2.2,  4.1,  0.2, 2.1, 150, false),
(null, 'Betterave cuite',       '["cooked beetroot","betterave"]',            44,  1.7,  9.9,  0.1, 2.0, 100, false),
(null, 'Maïs cuit',             '["corn cooked","maïs doux"]',               86,  3.2, 19.0,  1.2, 2.7, 150, false),
(null, 'Petits pois cuits',     '["green peas cooked","petits pois"]',        84,  5.4, 15.6,  0.4, 5.5, 150, false),
(null, 'Avocat',                '["avocado","avocat hass"]',                 160,  2.0,  8.5, 14.7, 6.7, 100, false),
(null, 'Patate douce cuite',    '["sweet potato cooked","patate douce"]',     90,  2.0, 20.7,  0.1, 3.3, 150, false),
(null, 'Pomme de terre cuite',  '["cooked potato","pomme de terre"]',         87,  1.9, 20.1,  0.1, 1.8, 180, false),
(null, 'Ail',                   '["garlic","ail frais"]',                    149,  6.4, 33.1,  0.5, 2.1,   5, false),
(null, 'Céleri',                '["celery","céleri branche"]',                16,  0.7,  3.0,  0.2, 1.6, 100, false),

-- ── NOIX & GRAINES ────────────────────────────────────────────
(null, 'Amandes',               '["almonds","amandes grillées"]',            579, 21.2, 21.6, 49.9, 12.5, 30, false),
(null, 'Noix',                  '["walnuts","cerneaux de noix"]',            654, 15.2, 13.7, 65.2,  6.7, 30, false),
(null, 'Noisettes',             '["hazelnuts","noisettes grillées"]',        628, 15.0, 16.7, 60.8,  9.7, 30, false),
(null, 'Noix de cajou',         '["cashews","noix cajou"]',                  553, 18.2, 30.2, 43.9,  3.3, 30, false),
(null, 'Pistaches',             '["pistachios","pistaches grillées"]',       562, 20.6, 27.2, 45.4, 10.6, 30, false),
(null, 'Noix de pécan',         '["pecans","noix pécan"]',                   691, 9.2,  13.9, 72.0,  9.6, 30, false),
(null, 'Graines de chia',       '["chia seeds","graines chia"]',             486, 16.5, 42.1, 30.7, 34.4, 15, false),
(null, 'Graines de lin',        '["flax seeds","graines lin"]',              534, 18.3, 28.9, 42.2, 27.3, 15, false),
(null, 'Graines de tournesol',  '["sunflower seeds","graines tournesol"]',   584, 20.8, 20.0, 51.5,  8.6, 30, false),
(null, 'Beurre de cacahuète',   '["peanut butter","beurre arachide"]',       588, 25.1, 20.1, 50.4,  6.0, 30, false),

-- ── CORPS GRAS ────────────────────────────────────────────────
(null, 'Huile d''olive',        '["olive oil","huile olive"]',               884,  0.0,  0.0, 100.0, 0.0, 10, false),
(null, 'Huile de coco',         '["coconut oil","huile noix de coco"]',      892,  0.0,  0.0, 100.0, 0.0, 10, false),
(null, 'Huile de tournesol',    '["sunflower oil"]',                         884,  0.0,  0.0, 100.0, 0.0, 10, false),
(null, 'Margarine',             '["margarine végétale"]',                    722,  0.2,  0.4, 80.0,  0.0, 10, false),
(null, 'Crème fraîche allégée', '["light sour cream","crème allégée 15%"]', 162,  2.5,  4.0, 15.0,  0.0, 30, false),

-- ── PROTÉINES SPORT ───────────────────────────────────────────
(null, 'Whey protéine',         '["whey protein","protéine lactosérum"]',   370, 80.0, 10.0,  4.0,  0.0, 30, false),
(null, 'Isolat soja',           '["soy protein isolate","isolat protéine"]', 340, 88.0,  1.0,  1.0,  0.0, 30, false),

-- ── PLATS & FAST FOOD ─────────────────────────────────────────
(null, 'Croissant',             '["croissant beurre"]',                     406, 8.2,  45.5, 21.2, 2.1,  60, false),
(null, 'Pain au chocolat',      '["chocolatine","pain chocolat"]',           394, 7.6,  44.0, 20.7, 2.0,  70, false),
(null, 'Madeleine',             '["madeleine nature","madeleine"]',          416, 6.5,  57.5, 17.5, 1.5,  25, false),
(null, 'Biscuit sablé',         '["shortbread","sablé beurre"]',             498, 5.5,  67.5, 24.0, 1.8,  20, false),
(null, 'Crêpe nature',          '["crepe","crêpe farine"]',                  193, 5.8,  26.0,  7.2, 1.0,  80, false),
(null, 'Gaufre',                '["waffle","gaufre bruxelles"]',             291, 6.5,  42.0, 11.0, 1.5,  80, false),
(null, 'Pizza margherita',      '["pizza","pizza tomato cheese"]',           250, 10.5, 33.0,  8.0, 2.0, 250, false),
(null, 'Hamburger maison',      '["burger","hamburger"]',                    295, 17.0, 24.0, 13.5, 1.5, 200, false),
(null, 'Frites',                '["french fries","frites","chips frites"]',  312, 3.4,  41.0, 15.0, 3.5, 150, false),
(null, 'Riz sauté',             '["fried rice","riz cantonais"]',            163, 4.5,  28.0,  4.0, 1.5, 250, false),
(null, 'Quiche lorraine',       '["quiche","quiche au fromage"]',            318, 9.5,  18.5, 23.0, 0.8, 150, false),
(null, 'Croque-monsieur',       '["croque monsieur","toast jambon fromage"]',310, 15.0, 25.0, 16.5, 1.5, 130, false),
(null, 'Omelette nature',       '["omelette","omelette 2 oeufs"]',           154, 11.8,  0.5, 11.5, 0.0, 150, false),
(null, 'Tarte aux pommes',      '["apple pie","tarte pomme"]',              237, 3.0,  33.0, 10.5, 2.0, 120, false),

-- ── BOISSONS ──────────────────────────────────────────────────
(null, 'Café noir',             '["black coffee","café espresso","espresso"]',  2, 0.1,  0.3,  0.0, 0.0, 200, false),
(null, 'Thé infusé',            '["tea","thé vert","thé noir"]',               1, 0.1,  0.3,  0.0, 0.0, 250, false),
(null, 'Jus d''orange frais',   '["fresh orange juice","jus orange"]',        44, 0.7, 10.4,  0.2, 0.2, 200, false),
(null, 'Lait d''amande',        '["almond milk","lait amande"]',              17, 0.6,  2.0,  1.0, 0.4, 250, false),
(null, 'Lait de soja',          '["soy milk","lait soja"]',                   40, 3.4,  2.5,  1.8, 0.5, 250, false),
(null, 'Vin rouge',             '["red wine","vin rouge sec"]',               85, 0.1,  2.6,  0.0, 0.0, 125, false),
(null, 'Bière blonde',          '["beer","bière"]',                           43, 0.5,  3.6,  0.0, 0.0, 330, false),
(null, 'Eau',                   '["water","eau plate","eau gazeuse"]',          0, 0.0,  0.0,  0.0, 0.0, 250, false),

-- ── SAUCES & CONDIMENTS ───────────────────────────────────────
(null, 'Mayonnaise',            '["mayonnaise","mayo"]',                     680, 1.4,  3.8, 74.0, 0.0, 15, false),
(null, 'Ketchup',               '["ketchup tomate"]',                        101, 1.7, 25.6,  0.1, 0.8, 20, false),
(null, 'Moutarde de Dijon',     '["mustard","moutarde"]',                     66, 4.4,  6.0,  3.5, 3.5, 10, false),
(null, 'Vinaigrette',           '["salad dressing","vinaigrette classique"]', 450, 0.0,  5.0, 48.0, 0.0, 15, false),
(null, 'Sauce tomate',          '["tomato sauce","coulis tomate"]',           35, 1.7,  7.0,  0.3, 1.4, 80, false),
(null, 'Sauce soja',            '["soy sauce","tamari"]',                     60, 6.0,  5.6,  0.0, 0.7, 15, false),
(null, 'Hummus',                '["houmous","hummus"]',                      177, 7.9, 14.3, 10.4, 6.0, 50, false),

-- ── SUCRÉ & DIVERS ────────────────────────────────────────────
(null, 'Chocolat noir 70%',     '["dark chocolate","chocolat noir"]',        598, 7.9, 45.9, 42.6, 10.9, 30, false),
(null, 'Chocolat au lait',      '["milk chocolate","chocolat lait"]',        535, 7.6, 59.5, 29.7,  2.5, 30, false),
(null, 'Miel',                  '["honey","miel toutes fleurs"]',            304, 0.3, 82.4,  0.0,  0.2, 15, false),
(null, 'Sucre blanc',           '["sugar","sucre en poudre"]',               400, 0.0,100.0,  0.0,  0.0, 10, false),
(null, 'Sirop d''érable',       '["maple syrup","sirop érable"]',            260, 0.1, 67.1,  0.1,  0.0, 20, false),
(null, 'Confiture',             '["jam","confiture fraise","marmelade"]',    250, 0.6, 65.0,  0.1,  1.5, 20, false),
(null, 'Compote pomme',         '["applesauce","compote sans sucre"]',        47, 0.2, 12.7,  0.1,  1.3,100, false),
(null, 'Yaourt aux fruits',     '["fruit yogurt","yaourt fraise"]',           86, 3.0, 15.0,  1.5,  0.3,125, false),
(null, 'Mousse au chocolat',    '["chocolate mousse","mousse chocolat"]',    225, 5.0, 20.0, 14.0,  0.8,100, false),
(null, 'Riz au lait',           '["rice pudding","riz au lait sucré"]',      100, 2.9, 17.0,  2.0,  0.3,150, false),
(null, 'Crème dessert chocolat','["chocolate pudding","danette"]',           115, 3.2, 17.5,  3.8,  0.3,125, false),
(null, 'Glace vanille',         '["vanilla ice cream","glace","sorbet"]',    207, 3.5, 24.0, 11.0,  0.5,100, false);