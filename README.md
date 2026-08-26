# K World

K World is a static educational RPG for children. Player progress stays in the browser on the current device; the site does not require accounts or a server.

## Publish with GitHub Pages

1. Create a GitHub repository and push this project to its `main` branch.
2. Open the repository's **Settings → Pages**.
3. Under **Build and deployment**, choose **GitHub Actions** as the source.
4. The included workflow builds and publishes the site automatically after each push to `main`.

The workflow supports both project sites such as `username.github.io/kworld` and user sites such as `username.github.io`.

If you use a custom domain, add a repository Actions variable named `NEXT_PUBLIC_SITE_URL` containing the full public origin, for example `https://learn.example.com`.

## Local development

Use Node.js 22.13 or later:

```bash
npm install
npm run dev
```
