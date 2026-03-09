-- ══════════════════════════════════════════════════════════════════════════════
-- SEED: Churches & Faith — Grayson County, KY
-- Source: Google Places API, 2026-03-08
-- Run in: Supabase Dashboard → SQL Editor → New Query
--
-- Inserts directly as status='approved' — bypasses pending queue.
-- All entries are unclaimed and free to claim by church representatives.
-- ══════════════════════════════════════════════════════════════════════════════

INSERT INTO providers (
  name, category, subcategory, phone, address, town,
  website, status, claim_status, listing_tier, tags, tenant_id
) VALUES

-- ── LEITCHFIELD ───────────────────────────────────────────────────────────────

('St Joseph Catholic Church',               'Churches & Faith', 'Catholic',          '(270) 259-3028', '206 N Main St, Leitchfield, KY 42754',         'Leitchfield', 'https://stjosephch.org/',                          'approved', 'unclaimed', 'none', '{}', 'grayson'),
('First Baptist Church',                    'Churches & Faith', 'Baptist',            '(270) 259-4076', '106 E Walnut St, Leitchfield, KY 42754',        'Leitchfield', 'http://www.fbcleitchfield.com/',                   'approved', 'unclaimed', 'none', '{}', 'grayson'),
('Potter''s Hope Ministries',               'Churches & Faith', NULL,                 '(270) 287-9117', '135 Commerce Dr Ste A, Leitchfield, KY 42754',  'Leitchfield', 'http://pottershope.com/',                          'approved', 'unclaimed', 'none', '{}', 'grayson'),
('First Cumberland Presbyterian Church',    'Churches & Faith', 'Presbyterian',       '(270) 259-3835', '501 W Chestnut St, Leitchfield, KY 42754',      'Leitchfield', NULL,                                               'approved', 'unclaimed', 'none', '{}', 'grayson'),
('Cross Point Baptist Church',              'Churches & Faith', 'Baptist',            '(270) 259-8305', '498 S Main St, Leitchfield, KY 42754',          'Leitchfield', 'http://www.crosspointleitchfield.org/',            'approved', 'unclaimed', 'none', '{}', 'grayson'),
('Leitchfield Christian Church',            'Churches & Faith', 'Christian Church',   '(270) 259-3869', '115 W Walnut St, Leitchfield, KY 42754',        'Leitchfield', NULL,                                               'approved', 'unclaimed', 'none', '{}', 'grayson'),
('Leitchfield United Methodist',            'Churches & Faith', 'Methodist',          '(270) 259-4019', '201 W Main St, Leitchfield, KY 42754',          'Leitchfield', 'http://www.leitchfieldumc.org/',                   'approved', 'unclaimed', 'none', '{}', 'grayson'),
('Clearview Baptist Church',                'Churches & Faith', 'Baptist',            '(270) 287-0222', '505 W White Oak St, Leitchfield, KY 42754',     'Leitchfield', NULL,                                               'approved', 'unclaimed', 'none', '{}', 'grayson'),
('First General Baptist Church',            'Churches & Faith', 'Baptist',            '(270) 446-0505', '856 W White Oak St, Leitchfield, KY 42754',     'Leitchfield', NULL,                                               'approved', 'unclaimed', 'none', '{}', 'grayson'),
('Church of Joy',                           'Churches & Faith', NULL,                 '(270) 259-3926', '100 Schoolhouse Rd, Leitchfield, KY 42754',     'Leitchfield', 'https://cojky.com/',                               'approved', 'unclaimed', 'none', '{}', 'grayson'),
('The Restoration Place',                   'Churches & Faith', NULL,                 '(270) 230-9117', '115 Sequoia Dr, Leitchfield, KY 42754',         'Leitchfield', 'http://therestorationplaceleitchfield.com/',       'approved', 'unclaimed', 'none', '{}', 'grayson'),
('The Well',                                'Churches & Faith', NULL,                 '(270) 259-4019', '213 W Main St, Leitchfield, KY 42754',          'Leitchfield', NULL,                                               'approved', 'unclaimed', 'none', '{}', 'grayson'),
('Mount Vernon Church',                     'Churches & Faith', NULL,                 NULL,             '2404 Brandenburg Rd, Leitchfield, KY 42754',    'Leitchfield', NULL,                                               'approved', 'unclaimed', 'none', '{}', 'grayson'),
('Free Liberty Community Church',           'Churches & Faith', NULL,                 '(270) 256-5723', '72 Victory Heights Rd, Leitchfield, KY 42754',  'Leitchfield', NULL,                                               'approved', 'unclaimed', 'none', '{}', 'grayson'),
('New Life Assembly of God',                'Churches & Faith', 'Assembly of God',    '(270) 287-0049', '47 Embry Acres Dr, Leitchfield, KY 42754',      'Leitchfield', NULL,                                               'approved', 'unclaimed', 'none', '{}', 'grayson'),
('West Main Street Church of Christ',       'Churches & Faith', 'Church of Christ',   NULL,             '501 W Main St, Leitchfield, KY 42754',          'Leitchfield', NULL,                                               'approved', 'unclaimed', 'none', '{}', 'grayson'),
('New Life Apostolic United Pentecostal',   'Churches & Faith', 'Pentecostal',        NULL,             '510 N Clinton St, Leitchfield, KY 42754',       'Leitchfield', NULL,                                               'approved', 'unclaimed', 'none', '{}', 'grayson'),
('Leitchfield Seventh-day Adventist Church','Churches & Faith', 'Adventist',          '(270) 524-5407', '304 Sunbeam Rd, Leitchfield, KY 42754',         'Leitchfield', 'http://leitchfieldky.adventistchurch.org/',        'approved', 'unclaimed', 'none', '{}', 'grayson'),
('Radiant Church GC',                       'Churches & Faith', NULL,                 NULL,             '5170 Beaver Dam Rd, Leitchfield, KY 42754',     'Leitchfield', 'https://www.radiantchurchgc.com/',                 'approved', 'unclaimed', 'none', '{}', 'grayson'),
('Holy Trinity Lutheran Church',            'Churches & Faith', 'Lutheran',           '(270) 259-9241', '889 Lilac Rd, Leitchfield, KY 42754',           'Leitchfield', 'https://www.holytrinityky.com/',                   'approved', 'unclaimed', 'none', '{}', 'grayson'),
('Little Clifty Baptist Church',            'Churches & Faith', 'Baptist',            NULL,             '2575 Clifty Church Dr, Leitchfield, KY 42754',  'Leitchfield', NULL,                                               'approved', 'unclaimed', 'none', '{}', 'grayson'),

-- ── CLARKSON ──────────────────────────────────────────────────────────────────

('Clarkson Community Church',               'Churches & Faith', NULL,                 '(270) 230-2169', '609 W Main St, Clarkson, KY 42726',             'Clarkson',    NULL,                                               'approved', 'unclaimed', 'none', '{}', 'grayson'),
('St Elizabeth Church',                     'Churches & Faith', 'Catholic',           '(270) 242-4414', '306 Clifty Ave, Clarkson, KY 42726',            'Clarkson',    NULL,                                               'approved', 'unclaimed', 'none', '{}', 'grayson'),
('Clarkson Baptist Church',                 'Churches & Faith', 'Baptist',            '(270) 242-4567', '5115 Elizabethtown Rd, Clarkson, KY 42726',     'Clarkson',    'https://www.clarksonbaptist.com/',                 'approved', 'unclaimed', 'none', '{}', 'grayson'),
('One Truth Community Church',              'Churches & Faith', NULL,                 NULL,             'Clarkson, KY 42726',                            'Clarkson',    NULL,                                               'approved', 'unclaimed', 'none', '{}', 'grayson'),
('Clarkson Church of Christ',               'Churches & Faith', 'Church of Christ',   '(270) 242-7235', '307 Elizabethtown Rd, Clarkson, KY 42726',      'Clarkson',    'http://www.clarksonchurchofchrist.church/',        'approved', 'unclaimed', 'none', '{}', 'grayson'),
('St Augustine''s Catholic Church',         'Churches & Faith', 'Catholic',           '(270) 242-4791', '30 St Augustine Rd, Clarkson, KY 42726',        'Clarkson',    'https://triparishky.org/',                         'approved', 'unclaimed', 'none', '{}', 'grayson'),
('Gospel Light Holiness Church',            'Churches & Faith', NULL,                 NULL,             '4804 Millerstown Rd, Clarkson, KY 42726',       'Clarkson',    NULL,                                               'approved', 'unclaimed', 'none', '{}', 'grayson'),
('Still Waters Ministries',                 'Churches & Faith', NULL,                 '(270) 242-0459', '285 Antioch Rd, Clarkson, KY 42726',            'Clarkson',    NULL,                                               'approved', 'unclaimed', 'none', '{}', 'grayson'),
('St Anthony Catholic Church',              'Churches & Faith', 'Catholic',           '(270) 242-4791', '1256 St Anthony Rd, Clarkson, KY 42726',        'Clarkson',    'https://triparishky.org/',                         'approved', 'unclaimed', 'none', '{}', 'grayson'),
('Jubilee The Church',                      'Churches & Faith', NULL,                 NULL,             '206 Old Leitchfield Rd, Clarkson, KY 42726',    'Clarkson',    NULL,                                               'approved', 'unclaimed', 'none', '{}', 'grayson'),
('Oak Grove Church',                        'Churches & Faith', NULL,                 NULL,             'Clarkson, KY 42726',                            'Clarkson',    NULL,                                               'approved', 'unclaimed', 'none', '{}', 'grayson'),
('Antioch Church',                          'Churches & Faith', NULL,                 NULL,             'Clarkson, KY 42726',                            'Clarkson',    NULL,                                               'approved', 'unclaimed', 'none', '{}', 'grayson'),
('St Benedict Catholic Church',             'Churches & Faith', 'Catholic',           '(270) 242-4791', '6874 Wax Rd, Clarkson, KY 42726',               'Clarkson',    'https://triparishky.org/',                         'approved', 'unclaimed', 'none', '{}', 'grayson'),
('Little Flock Missionary Church',          'Churches & Faith', NULL,                 NULL,             '7596 Millerstown Rd, Clarkson, KY 42726',       'Clarkson',    NULL,                                               'approved', 'unclaimed', 'none', '{}', 'grayson'),
('Clarkson United Methodist Church',        'Churches & Faith', 'Methodist',          '(270) 242-0230', 'E Old Leitchfield Rd, Clarkson, KY 42726',      'Clarkson',    NULL,                                               'approved', 'unclaimed', 'none', '{}', 'grayson'),
('Lone Oak Missionary Baptist Church',      'Churches & Faith', 'Baptist',            NULL,             '27 Wheeler Mill Rd, Clarkson, KY 42726',        'Clarkson',    NULL,                                               'approved', 'unclaimed', 'none', '{}', 'grayson'),

-- ── CANEYVILLE ────────────────────────────────────────────────────────────────

('New Hope Church',                         'Churches & Faith', NULL,                 NULL,             '4078 Falls of Rough Rd, Caneyville, KY 42721',  'Caneyville',  'http://faithcovenantnetwork.com/',                 'approved', 'unclaimed', 'none', '{}', 'grayson'),
('Caneyville Church of Christ',             'Churches & Faith', 'Church of Christ',   NULL,             '201 N Main St, Caneyville, KY 42721',           'Caneyville',  'http://caneyvillechurchofchrist.com/',             'approved', 'unclaimed', 'none', '{}', 'grayson'),
('New Harvest Baptist Church',              'Churches & Faith', 'Baptist',            '(270) 879-3103', '815 N Main St, Caneyville, KY 42721',           'Caneyville',  'https://newharvestbaptist.org/',                   'approved', 'unclaimed', 'none', '{}', 'grayson'),
('Caneyville Christian Church',             'Churches & Faith', 'Christian Church',   '(270) 879-6241', '218 S Main St, Caneyville, KY 42721',           'Caneyville',  'http://www.caneyvillechristian.com/',              'approved', 'unclaimed', 'none', '{}', 'grayson'),
('Caneyville Baptist Church',               'Churches & Faith', 'Baptist',            '(270) 879-8913', 'Caneyville, KY 42721',                          'Caneyville',  NULL,                                               'approved', 'unclaimed', 'none', '{}', 'grayson'),
('Hopewell Church',                         'Churches & Faith', NULL,                 NULL,             'Caneyville, KY 42721',                          'Caneyville',  NULL,                                               'approved', 'unclaimed', 'none', '{}', 'grayson'),
('Caneyville Church of God of Prophecy',    'Churches & Faith', 'Church of God',      NULL,             '2857 Bowling Green Rd, Caneyville, KY 42721',   'Caneyville',  NULL,                                               'approved', 'unclaimed', 'none', '{}', 'grayson'),
('Southside Christian Center',              'Churches & Faith', NULL,                 NULL,             'Caneyville, KY 42721',                          'Caneyville',  NULL,                                               'approved', 'unclaimed', 'none', '{}', 'grayson'),
('Wilson Home Church',                      'Churches & Faith', NULL,                 '(270) 589-7557', '3095 Bryant Rd, Caneyville, KY 42721',          'Caneyville',  NULL,                                               'approved', 'unclaimed', 'none', '{}', 'grayson'),
('Pleasant Union United Baptist Church',    'Churches & Faith', 'Baptist',            NULL,             '2170 Wilson Church Rd, Caneyville, KY 42721',   'Caneyville',  NULL,                                               'approved', 'unclaimed', 'none', '{}', 'grayson'),
('Smalls Grove Church',                     'Churches & Faith', NULL,                 NULL,             '14334 Beaver Dam Rd, Caneyville, KY 42721',     'Caneyville',  NULL,                                               'approved', 'unclaimed', 'none', '{}', 'grayson'),
('Caney Creek Church',                      'Churches & Faith', NULL,                 NULL,             '6006 Caneyville Rd, Caneyville, KY 42721',      'Caneyville',  NULL,                                               'approved', 'unclaimed', 'none', '{}', 'grayson'),
('Mount Pleasant Cumberland Presbyterian',  'Churches & Faith', 'Presbyterian',       NULL,             '2263 Big Reedy Rd, Caneyville, KY 42721',       'Caneyville',  NULL,                                               'approved', 'unclaimed', 'none', '{}', 'grayson'),
('Beech Grove Church',                      'Churches & Faith', NULL,                 NULL,             'Caneyville, KY 42721',                          'Caneyville',  NULL,                                               'approved', 'unclaimed', 'none', '{}', 'grayson'),
('Free Zion Church',                        'Churches & Faith', NULL,                 NULL,             'Caneyville, KY 42721',                          'Caneyville',  NULL,                                               'approved', 'unclaimed', 'none', '{}', 'grayson'),
('Pleasant Valley Church',                  'Churches & Faith', NULL,                 NULL,             '7809 Beaver Dam Rd, Caneyville, KY 42721',      'Caneyville',  NULL,                                               'approved', 'unclaimed', 'none', '{}', 'grayson'),
('Pleasant View Church',                    'Churches & Faith', NULL,                 NULL,             'Caneyville, KY 42721',                          'Caneyville',  NULL,                                               'approved', 'unclaimed', 'none', '{}', 'grayson'),
('Old Time Wilson Baptist Church',          'Churches & Faith', 'Baptist',            NULL,             '2171 Wilson Church Rd, Caneyville, KY 42721',   'Caneyville',  NULL,                                               'approved', 'unclaimed', 'none', '{}', 'grayson'),

-- ── BIG CLIFTY ────────────────────────────────────────────────────────────────

('Big Clifty Church of Christ',             'Churches & Faith', 'Church of Christ',   NULL,             '259 Cemetery Rd, Big Clifty, KY 42712',         'Big Clifty',  NULL,                                               'approved', 'unclaimed', 'none', '{}', 'grayson'),
('Little Clifty United Methodist Church',   'Churches & Faith', 'Methodist',          NULL,             '32 Little Clifty Rd, Big Clifty, KY 42712',     'Big Clifty',  NULL,                                               'approved', 'unclaimed', 'none', '{}', 'grayson'),
('New Hope Church of Christ',               'Churches & Faith', 'Church of Christ',   '(270) 242-7901', '3585 Spurrier Rd, Big Clifty, KY 42712',        'Big Clifty',  NULL,                                               'approved', 'unclaimed', 'none', '{}', 'grayson'),
('Mount Olive Cumberland Church',           'Churches & Faith', 'Presbyterian',       NULL,             '3335 Mt Olive Rd, Big Clifty, KY 42712',        'Big Clifty',  NULL,                                               'approved', 'unclaimed', 'none', '{}', 'grayson'),
('Smith Chapel United Methodist',           'Churches & Faith', 'Methodist',          '(270) 862-3974', '22121 Sonora Hardin Springs Rd, Big Clifty, KY 42712', 'Big Clifty', NULL,                                         'approved', 'unclaimed', 'none', '{}', 'grayson'),
('Putting Prayers to Action',               'Churches & Faith', NULL,                 '(270) 735-3155', '1248 Solway Meeting Rd, Big Clifty, KY 42712',  'Big Clifty',  'https://puttingprayerstoaction.com/',              'approved', 'unclaimed', 'none', '{}', 'grayson')

ON CONFLICT DO NOTHING;

-- ══════════════════════════════════════════════════════════════════════════════
-- Total: 62 churches across 4 towns (Leitchfield 21, Clarkson 16, Caneyville 19, Big Clifty 6)
-- Wax: no unique churches found — nearest are in Clarkson per Google Places
-- Source: Google Places API text search, 2026-03-08
-- ══════════════════════════════════════════════════════════════════════════════
