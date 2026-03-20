# Email support (customer notifications)

The app sends customer emails for:

- **Payment receipt** — after any successful checkout
- **Subscription activated** — when a Pro subscription is activated after payment
- **Trial started** — when a new user registers (free trial begins)
- **Subscription cancelled** — when a user cancels their subscription
- **Trial ending reminder** — when trial ends in the next few days (sent by weekly script)
- **Weekly dashboard summary** — profile count and activity summary (sent by weekly script)

## Backend (Resend)

1. **Sign up** at [resend.com](https://resend.com) and create an API key.
2. **Verify your domain** (or use `onboarding@resend.dev` for testing).
3. In the backend `.env` (same place as Square vars), add:

   ```env
   RESEND_API_KEY=re_xxxxxxxxxxxx
   EMAIL_FROM="Share Your Heart Today <notifications@yourdomain.com>"
   ```

   If `EMAIL_FROM` is omitted, the default is `Share Your Heart Today <onboarding@resend.dev>` (Resend’s test sender).

4. Restart the backend: `node backend-example.js`.

The frontend calls `POST /api/send-notification` with `{ to, type, data }`. If `RESEND_API_KEY` is not set, the backend still returns success and logs that the email was skipped (so the app does not break).

## Frontend

- `REACT_APP_BACKEND_API_URL` must point to your backend (e.g. `http://localhost:3001`) so notification requests can be sent.
- Emails are triggered automatically on:
  - Registration → trial started
  - Successful checkout → payment receipt (+ subscription activated if the cart had a subscription)
  - Subscription cancellation → subscription cancelled

## Weekly summary and trial reminders

A Node script sends **weekly dashboard summaries** and **trial-ending reminders** by calling the same backend `/api/send-notification` endpoint.

### Requirements

- Backend running (or at least reachable at `BACKEND_API_URL`) when the script runs.
- Supabase **service role** key (not the anon key) so the script can list users and read subscriptions.

In `.env` (or the environment of your cron runner), set:

```env
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
BACKEND_API_URL=http://localhost:3001
```

Optional: `APP_URL` for link in emails (e.g. `https://yourapp.com`).

### Running the script

From the project root:

```bash
# Both: weekly summary + trial-ending reminders
node scripts/weekly-email-summary.js

# Weekly summary only (e.g. every Monday)
node scripts/weekly-email-summary.js --summary

# Trial-ending reminders only (e.g. daily)
node scripts/weekly-email-summary.js --trial
```

- **Weekly summary**: one email per user who has at least one profile; content includes profile count and a “this week” period.
- **Trial reminder**: one email per user whose trial ends within the next 3 days (based on `subscription_end_date` and `trial_start_date`).

### Cron examples

- Weekly summary (e.g. Monday 9:00):

  ```cron
  0 9 * * 1 cd /path/to/suh && node scripts/weekly-email-summary.js --summary
  ```

- Trial reminders (daily):

  ```cron
  0 9 * * * cd /path/to/suh && node scripts/weekly-email-summary.js --trial
  ```

- Or run both without flags once per week:

  ```cron
  0 9 * * 1 cd /path/to/suh && node scripts/weekly-email-summary.js
  ```

Ensure the backend is running (or that `BACKEND_API_URL` points to a running backend) when the script runs, and that `RESEND_API_KEY` and `EMAIL_FROM` are set in the backend’s environment so emails are actually sent.
