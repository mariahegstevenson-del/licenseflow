# LicenseFlow

License support portal for life insurance agents — exam study hub, CE credit tracker, renewal reminders, and support desk. Static site (nginx) + Supabase, deployed on Railway.

## Authentication

Sign-in is handled by Supabase Auth. There are two entry points — email + password, and Continue with Google — and both finish on the same page.

Every redirect-based sign-in returns to `auth-callback.html`, which exchanges the PKCE `?code=` for a session and then forwards to `app.html`. It also handles `?token_hash=` links, implicit `#access_token=` returns, and provider `?error=` returns.

Any origin the site is served from must be listed under Supabase → Authentication → URL Configuration, or the redirect back from Google (and from email links) is rejected.
