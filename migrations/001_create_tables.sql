CREATE TABLE factor_category (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE factor (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category_id INTEGER NOT NULL,
    CONSTRAINT fk_factor_category
        FOREIGN KEY (category_id)
        REFERENCES factor_category (id)
        ON DELETE CASCADE
);

CREATE INDEX ix_factor_name ON factor (name);

CREATE TABLE entry (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    note TEXT
);

CREATE INDEX ix_entry_timestamp ON entry (timestamp);

CREATE TABLE entry_and_factor (
    id SERIAL PRIMARY KEY,
    entry_id INTEGER NOT NULL,
    factor_id INTEGER NOT NULL,
    note TEXT,
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
