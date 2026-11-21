CREATE TABLE subscriptions (
    id uuid PRIMARY KEY,
    user_id uuid NOT NULL,
    name varchar(100) NOT NULL,
    category varchar(16) NOT NULL,
    amount numeric(12, 2) NOT NULL,
    billing_cycle varchar(7) NOT NULL,
    start_date date NOT NULL,
    is_trial boolean NOT NULL,
    trial_end_date date,
    status varchar(9) NOT NULL,
    notes varchar(500),
    created_at timestamptz NOT NULL,
    updated_at timestamptz NOT NULL,
    cancelled_at timestamptz,
    version bigint NOT NULL,
    CONSTRAINT subscriptions_user_fk
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT subscriptions_category_check
        CHECK (category IN (
            'ENTERTAINMENT', 'MUSIC', 'PRODUCTIVITY', 'CLOUD_AND_AI',
            'EDUCATION', 'UTILITIES', 'SHOPPING', 'OTHER'
        )),
    CONSTRAINT subscriptions_billing_cycle_check
        CHECK (billing_cycle IN ('WEEKLY', 'MONTHLY', 'YEARLY')),
    CONSTRAINT subscriptions_status_check
        CHECK (status IN ('ACTIVE', 'CANCELLED')),
    CONSTRAINT subscriptions_amount_check
        CHECK (amount > 0 AND amount <= 9999999.99),
    CONSTRAINT subscriptions_trial_check
        CHECK (
            (is_trial AND trial_end_date IS NOT NULL AND trial_end_date >= start_date)
            OR (NOT is_trial AND trial_end_date IS NULL)
        )
);

CREATE INDEX subscriptions_user_status_idx ON subscriptions (user_id, status);
