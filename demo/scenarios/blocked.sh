#!/usr/bin/env bash
# Setup: Friday 5pm nightmare — migration + payments code touched.
set -e
DIR="$1"
cd "$DIR"

git init -q -b main
git config user.email "demo@shipit.dev"
git config user.name  "Demo"

mkdir -p migrations src/payments
echo "SELECT 1;" > migrations/001_init.sql
echo "export const charge = () => 'v1';" > src/payments/stripe.ts
git add . && git commit -q -m "feat: initial payments module"

# The scary change:
cat > migrations/002_alter_charges.sql <<'EOF'
ALTER TABLE charges ADD COLUMN new_field TEXT;
UPDATE charges SET new_field = 'default';
ALTER TABLE charges ALTER COLUMN new_field SET NOT NULL;
EOF

cat > src/payments/stripe.ts <<'EOF'
import Stripe from 'stripe';
export async function charge(amount: number, customerId: string) {
  const s = new Stripe(process.env.STRIPE_KEY!);
  return s.charges.create({ amount, currency: 'usd', customer: customerId });
}
EOF

git add . && git commit -q -m "feat(payments): new charges migration + rewrite stripe integration"
