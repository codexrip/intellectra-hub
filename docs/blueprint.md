# **App Name**: Intellectra Hub

## Core Features:

- User Authentication: Secure user login and registration using Firebase Authentication. Includes email/password and account freezing logic based on failed login attempts.
- Profile Management: Allow users to create and manage their profiles, including updating their display name and photo URL.  Data stored in Firestore.
- Wallet System: Implement a virtual wallet for users with the ability to 'buy' (mock) and 'withdraw' tokens.  Balances are stored in Firestore.
- Request Creation with Cost Calculation: Enable users to create requests with defined urgency and type, calculating the cost based on a predefined formula.
- Marketplace Feed: Display a list of all open requests with filtering options. Users can view request details and submit solutions.
- Solution Submission & Reward System: Allow users to submit solutions to requests and reward solvers with tokens and XP upon acceptance of their solution.
- Leveling System: Track user XP and level, awarding bonus tokens upon level up.

## Style Guidelines:

- Primary color: Deep purple (#6750A4) to evoke a sense of intellect and sophistication.
- Background color: Light gray (#F2F0F7), subtly tinted with purple for a clean and modern look.
- Accent color: Soft lavender (#D0BCFF) for highlights and interactive elements, creating a cohesive and inviting experience.
- Headline font: 'Space Grotesk' sans-serif for headings; body font: 'Inter' sans-serif for body text.
- Code font: 'Source Code Pro' for displaying code snippets.
- Use clean, modern icons from a consistent set. Use icons to visually represent urgency, type, and reward amounts. Consider icons for different categories of request.
- Maintain a clean and organized layout using a sidebar for primary navigation and cards for displaying requests in the marketplace.
- Incorporate subtle animations for transitions and loading states to enhance user experience. When wallet balances are updated, smoothly animate number changes.  Use transition effects when navigating pages, displaying the level-up modal, and for UI feedback