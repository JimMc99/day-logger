CREATE TABLE tag_category (
    id   SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE tag (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    category_id INTEGER NOT NULL,
    CONSTRAINT fk_tag_category
        FOREIGN KEY (category_id)
        REFERENCES tag_category (id)
        ON DELETE CASCADE,
    CONSTRAINT uq_tag_name_category UNIQUE (name, category_id)
);

CREATE INDEX ix_tag_name ON tag (name);

CREATE TABLE entry (
    id        SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    title     TEXT
);

CREATE INDEX ix_entry_timestamp ON entry (timestamp);

CREATE TABLE entry_tag (
    id       SERIAL PRIMARY KEY,
    entry_id INTEGER NOT NULL,
    tag_id   INTEGER NOT NULL,
    detail   TEXT,
    CONSTRAINT fk_entry
        FOREIGN KEY (entry_id)
        REFERENCES entry (id)
        ON DELETE CASCADE,
    CONSTRAINT fk_tag
        FOREIGN KEY (tag_id)
        REFERENCES tag (id)
        ON DELETE CASCADE,
    CONSTRAINT uq_entry_tag UNIQUE (entry_id, tag_id)
);

-- Categories
INSERT INTO tag_category (name) VALUES ('Food'), ('Feeling'), ('Activity');

-- Food
INSERT INTO tag (name, category_id) VALUES
    ('Coffee',     (SELECT id FROM tag_category WHERE name = 'Food')),
    ('Tea',        (SELECT id FROM tag_category WHERE name = 'Food')),
    ('Alcohol',    (SELECT id FROM tag_category WHERE name = 'Food')),
    ('Chocolate',  (SELECT id FROM tag_category WHERE name = 'Food')),
    ('Pizza',      (SELECT id FROM tag_category WHERE name = 'Food')),
    ('Pasta',      (SELECT id FROM tag_category WHERE name = 'Food')),
    ('Rice',       (SELECT id FROM tag_category WHERE name = 'Food')),
    ('Bread',      (SELECT id FROM tag_category WHERE name = 'Food')),
    ('Cereal',     (SELECT id FROM tag_category WHERE name = 'Food')),
    ('Eggs',       (SELECT id FROM tag_category WHERE name = 'Food')),
    ('Salad',      (SELECT id FROM tag_category WHERE name = 'Food')),
    ('Fruit',      (SELECT id FROM tag_category WHERE name = 'Food')),
    ('Soup',       (SELECT id FROM tag_category WHERE name = 'Food')),
    ('Cheese',     (SELECT id FROM tag_category WHERE name = 'Food')),
    ('Milk',       (SELECT id FROM tag_category WHERE name = 'Food')),
    ('Yoghurt',    (SELECT id FROM tag_category WHERE name = 'Food')),
    ('Fish',       (SELECT id FROM tag_category WHERE name = 'Food')),
    ('Chicken',    (SELECT id FROM tag_category WHERE name = 'Food')),
    ('Red meat',   (SELECT id FROM tag_category WHERE name = 'Food'));

-- Feeling
INSERT INTO tag (name, category_id) VALUES
    ('Energised',  (SELECT id FROM tag_category WHERE name = 'Feeling')),
    ('Tired',      (SELECT id FROM tag_category WHERE name = 'Feeling')),
    ('Focused',    (SELECT id FROM tag_category WHERE name = 'Feeling')),
    ('Foggy',      (SELECT id FROM tag_category WHERE name = 'Feeling')),
    ('Happy',      (SELECT id FROM tag_category WHERE name = 'Feeling')),
    ('Low',        (SELECT id FROM tag_category WHERE name = 'Feeling')),
    ('Calm',       (SELECT id FROM tag_category WHERE name = 'Feeling')),
    ('Anxious',    (SELECT id FROM tag_category WHERE name = 'Feeling')),
    ('Stressed',   (SELECT id FROM tag_category WHERE name = 'Feeling')),
    ('Bloated',    (SELECT id FROM tag_category WHERE name = 'Feeling')),
    ('Nauseous',   (SELECT id FROM tag_category WHERE name = 'Feeling')),
    ('Headache',   (SELECT id FROM tag_category WHERE name = 'Feeling'));

-- Activity
INSERT INTO tag (name, category_id) VALUES
    ('Run',        (SELECT id FROM tag_category WHERE name = 'Activity')),
    ('Walk',       (SELECT id FROM tag_category WHERE name = 'Activity')),
    ('Gym',        (SELECT id FROM tag_category WHERE name = 'Activity')),
    ('Cycle',      (SELECT id FROM tag_category WHERE name = 'Activity')),
    ('Swim',       (SELECT id FROM tag_category WHERE name = 'Activity')),
    ('Yoga',       (SELECT id FROM tag_category WHERE name = 'Activity')),
    ('Stretching', (SELECT id FROM tag_category WHERE name = 'Activity')),
    ('Good sleep', (SELECT id FROM tag_category WHERE name = 'Activity')),
    ('Poor sleep', (SELECT id FROM tag_category WHERE name = 'Activity')),
    ('Sedentary',  (SELECT id FROM tag_category WHERE name = 'Activity'));
    