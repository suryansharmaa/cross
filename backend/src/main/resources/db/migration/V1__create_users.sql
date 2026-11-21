CREATE TABLE users (
    id uuid PRIMARY KEY,
    email varchar(254) NOT NULL,
    password_hash varchar(60) NOT NULL,
    created_at timestamptz NOT NULL,
    updated_at timestamptz NOT NULL,
    version bigint NOT NULL,
    CONSTRAINT users_email_unique UNIQUE (email)
);
