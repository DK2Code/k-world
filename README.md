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

## Content architecture

- `content/grades.ts` defines individual Kindergarten through Grade 12 curriculum strands and presentation settings.
- `content/question-bank.ts` contains 936 typed activities: 24 each for science, math, and English in every grade.
- `content/world.ts` contains regions, quest stories, 325 grade-level Wonder Facts, and parent resources.
- `content/rotation.ts` selects fresh grade-level quest content without immediate repeats.
- `content/assessment.ts` powers untimed general, subject, and focused skill checks, adaptive selection, mastery evidence, and reports.
- `content/narration.ts` ranks device-provided English voices, prepares math and educational text for natural speech, and applies grade-aware delivery.
- `content/profile.ts` stores the local profile and safely migrates earlier age-band saves without removing progress.
- `content/evaluation.ts` evaluates all five activity formats.
- `scripts/validate-content.ts` checks every grade/subject pool, IDs, answers, duplicates, format variety, assessments, mastery, migration, reports, and quest rotation.

Run the content check directly with `npm run validate-content`. It also runs automatically before every production build.

All progress, assessment evidence, and narrator preferences stay in browser storage on the current device. Narration uses the browser Speech Synthesis API without microphone access or recording. K World assessments are informal game learning checks, not diagnostic or official school assessments.
