-- Allow authenticated users to insert their own payment records (e.g. after Square payment link success)
CREATE POLICY "Users can insert their own payment history"
  ON subscription_payments
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);
