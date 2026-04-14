CREATE TABLE factor_category (
    id   SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE factor (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    category_id INTEGER NOT NULL,
    CONSTRAINT fk_factor_category
        FOREIGN KEY (category_id)
        REFERENCES factor_category (id)
        ON DELETE CASCADE,
    CONSTRAINT uq_factor_name_category UNIQUE (name, category_id)
);

CREATE INDEX ix_factor_name ON factor (name);

CREATE TABLE entry (
    id        SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    note      TEXT
);

CREATE INDEX ix_entry_timestamp ON entry (timestamp);

CREATE TABLE entry_and_factor (
    id        SERIAL PRIMARY KEY,
    entry_id  INTEGER NOT NULL,
    factor_id INTEGER NOT NULL,
    note      TEXT,
    CONSTRAINT fk_entry
        FOREIGN KEY (entry_id)
        REFERENCES entry (id)
        ON DELETE CASCADE,
    CONSTRAINT fk_factor
        FOREIGN KEY (factor_id)
        REFERENCES factor (id)
        ON DELETE CASCADE,
    CONSTRAINT uc_entry_factor UNIQUE (entry_id, factor_id)
);

-- Categories
INSERT INTO factor_category (name) VALUES ('Food'), ('Feeling'), ('Activity');

-- Food
INSERT INTO factor (name, category_id) VALUES
    ('Coffee',     (SELECT id FROM factor_category WHERE name = 'Food')),
    ('Tea',        (SELECT id FROM factor_category WHERE name = 'Food')),
    ('Alcohol',    (SELECT id FROM factor_category WHERE name = 'Food')),
    ('Chocolate',  (SELECT id FROM factor_category WHERE name = 'Food')),
    ('Pizza',      (SELECT id FROM factor_category WHERE name = 'Food')),
    ('Pasta',      (SELECT id FROM factor_category WHERE name = 'Food')),
    ('Rice',       (SELECT id FROM factor_category WHERE name = 'Food')),
    ('Bread',      (SELECT id FROM factor_category WHERE name = 'Food')),
    ('Cereal',     (SELECT id FROM factor_category WHERE name = 'Food')),
    ('Eggs',       (SELECT id FROM factor_category WHERE name = 'Food')),
    ('Salad',      (SELECT id FROM factor_category WHERE name = 'Food')),
    ('Fruit',      (SELECT id FROM factor_category WHERE name = 'Food')),
    ('Soup',       (SELECT id FROM factor_category WHERE name = 'Food')),
    ('Cheese',     (SELECT id FROM factor_category WHERE name = 'Food')),
    ('Milk',       (SELECT id FROM factor_category WHERE name = 'Food')),
    ('Yoghurt',    (SELECT id FROM factor_category WHERE name = 'Food')),
    ('Fish',       (SELECT id FROM factor_category WHERE name = 'Food')),
    ('Chicken',    (SELECT id FROM factor_category WHERE name = 'Food')),
    ('Red meat',   (SELECT id FROM factor_category WHERE name = 'Food'));

-- Feeling
INSERT INTO factor (name, category_id) VALUES
    ('Energised',  (SELECT id FROM factor_category WHERE name = 'Feeling')),
    ('Tired',      (SELECT id FROM factor_category WHERE name = 'Feeling')),
    ('Focused',    (SELECT id FROM factor_category WHERE name = 'Feeling')),
    ('Foggy',      (SELECT id FROM factor_category WHERE name = 'Feeling')),
    ('Happy',      (SELECT id FROM factor_category WHERE name = 'Feeling')),
    ('Low',        (SELECT id FROM factor_category WHERE name = 'Feeling')),
    ('Calm',       (SELECT id FROM factor_category WHERE name = 'Feeling')),
    ('Anxious',    (SELECT id FROM factor_category WHERE name = 'Feeling')),
    ('Stressed',   (SELECT id FROM factor_category WHERE name = 'Feeling')),
    ('Bloated',    (SELECT id FROM factor_category WHERE name = 'Feeling')),
    ('Nauseous',   (SELECT id FROM factor_category WHERE name = 'Feeling')),
    ('Headache',   (SELECT id FROM factor_category WHERE name = 'Feeling'));

-- Activity
INSERT INTO factor (name, category_id) VALUES
    ('Run',        (SELECT id FROM factor_category WHERE name = 'Activity')),
    ('Walk',       (SELECT id FROM factor_category WHERE name = 'Activity')),
    ('Gym',        (SELECT id FROM factor_category WHERE name = 'Activity')),
    ('Cycle',      (SELECT id FROM factor_category WHERE name = 'Activity')),
    ('Swim',       (SELECT id FROM factor_category WHERE name = 'Activity')),
    ('Yoga',       (SELECT id FROM factor_category WHERE name = 'Activity')),
    ('Stretching', (SELECT id FROM factor_category WHERE name = 'Activity')),
    ('Good sleep', (SELECT id FROM factor_category WHERE name = 'Activity')),
    ('Poor sleep', (SELECT id FROM factor_category WHERE name = 'Activity')),
    ('Sedentary',  (SELECT id FROM factor_category WHERE name = 'Activity'));