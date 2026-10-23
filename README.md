# MiniLedger

MiniLedger helps you keep track of money lent to friends, due dates, and repayments.

## How it works

1. Log in with your phone number. The backend prints a mock OTP in its logs; no SMS is sent.
2. Add a loan with your friend's name, the amount, and a due date.
3. View your loans. Overdue entries are highlighted.
4. Mark a loan as repaid when your friend pays you back.
5. Track your total lent, total repaid, and overdue amounts on the dashboard.

## Technology

The backend uses Node.js, TypeScript, Express, and PostgreSQL. The frontend is a React Native and Expo app, with Expo Web support.

## Links

- **Frontend:** Not currently deployed. Run the Expo web app locally from `mobile/` with `npm run web`.
- **Backend:** [https://assign-8by4.onrender.com](https://assign-8by4.onrender.com)
  Health check: [https://assign-8by4.onrender.com/health](https://assign-8by4.onrender.com/health)
- **Source repository:** [https://github.com/Satyamsrivastav-ok/assign](https://github.com/Satyamsrivastav-ok/assign)
