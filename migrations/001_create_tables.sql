
CREATE TABLE baby (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    date_of_birth DATE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE entry_type (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    has_segments BOOLEAN NOT NULL DEFAULT FALSE,
    options_have_times BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE entry_option (
    id SERIAL PRIMARY KEY,
    entry_type_id INTEGER NOT NULL
        REFERENCES entry_type(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_entry_option_name UNIQUE (entry_type_id, name)
);

CREATE TABLE entry (
    id SERIAL PRIMARY KEY,
    baby_id INTEGER NOT NULL
        REFERENCES baby(id) ON DELETE CASCADE,
    entry_type_id INTEGER NOT NULL
        REFERENCES entry_type(id),
    started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX ix_entry_baby_started
    ON entry (baby_id, started_at DESC);

CREATE INDEX ix_entry_type
    ON entry (entry_type_id);

CREATE TABLE entry_option_selection (
    id SERIAL PRIMARY KEY,
    entry_id INTEGER NOT NULL
        REFERENCES entry(id) ON DELETE CASCADE,
    option_id INTEGER NOT NULL
        REFERENCES entry_option(id),
    selected_at TIMESTAMPTZ,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX ix_entry_option_selection_entry
    ON entry_option_selection (entry_id);

-- Initial baby
INSERT INTO baby (name) VALUES ('Baby');

-- Built-in activities
INSERT INTO entry_type
    (name, slug, description, icon, options_have_times, sort_order)
VALUES
    ('Breastfeeding', 'breastfeeding', 'Breastfeeding sessions', 'milk', TRUE, 1),
    ('Nappy change', 'nappy', 'Nappy changes', 'baby', FALSE, 2);

-- Breastfeeding options
INSERT INTO entry_option (entry_type_id, name, sort_order)
SELECT id, 'Left', 1 FROM entry_type WHERE slug = 'breastfeeding';

INSERT INTO entry_option (entry_type_id, name, sort_order)
SELECT id, 'Right', 2 FROM entry_type WHERE slug = 'breastfeeding';

INSERT INTO entry_option (entry_type_id, name, sort_order)
SELECT id, 'Burp', 3 FROM entry_type WHERE slug = 'breastfeeding';

-- Nappy options
INSERT INTO entry_option (entry_type_id, name, sort_order)
SELECT id, 'Poo', 1 FROM entry_type WHERE slug = 'nappy';

INSERT INTO entry_option (entry_type_id, name, sort_order)
SELECT id, 'Wee', 2 FROM entry_type WHERE slug = 'nappy';
