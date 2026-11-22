CREATE TABLE notifications (
    id uuid PRIMARY KEY,
    user_id uuid NOT NULL,
    subscription_id uuid NOT NULL,
    billing_date date NOT NULL,
    alert_type varchar(10) NOT NULL,
    kind varchar(12) NOT NULL,
    message varchar(300) NOT NULL,
    created_at timestamptz NOT NULL,
    read_at timestamptz,
    CONSTRAINT notifications_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT notifications_subscription_fk FOREIGN KEY (subscription_id) REFERENCES subscriptions (id) ON DELETE CASCADE,
    CONSTRAINT notifications_alert_type_check CHECK (alert_type IN ('THREE_DAYS', 'ONE_DAY')),
    CONSTRAINT notifications_kind_check CHECK (kind IN ('TRIAL_ENDING', 'RENEWAL')),
    CONSTRAINT notifications_alert_unique UNIQUE (subscription_id, billing_date, alert_type)
);

CREATE INDEX notifications_user_created_idx ON notifications (user_id, created_at DESC, id DESC);
CREATE INDEX notifications_unread_user_idx ON notifications (user_id) WHERE read_at IS NULL;
CREATE INDEX notifications_created_idx ON notifications (created_at);
