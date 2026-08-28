# K World

K World is a static educational RPG for children. Player progress stays in the browser on the current device; the site does not require accounts or a server.

## Publish with GitHub Pages

1. Create a GitHub repository and push this project to its `main` branch.
2. Open the repository's **Settings → Pages**.
3. Under **Build and deployment**, choose **GitHub Actions** as the source.
4. The included workflow builds and publishes the site automatically after each push to `main`.

The workflow supports both project sites such as `username.github.io/kworld` and user sites such as `username.github.io`.

This repository also includes the current static export at its root with `.nojekyll` as a compatibility fallback for repositories still configured to deploy from the `main` branch. Selecting **GitHub Actions** remains the preferred Pages setting and avoids competing deployments.

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
- `content/narration.ts` ranks device-provided English voices, prepares math and educational text for natural speech, and applies grade-aware Adventure Guide, Storyteller, or Learning Coach delivery.
- `content/profile.ts` stores the local profile, narrator and movable read-aloud controls, paused assessments, and separate learning progress for every grade while safely migrating earlier saves.
- `content/evaluation.ts` evaluates all five activity formats.
- `scripts/validate-content.ts` checks every grade/subject pool, IDs, answers, duplicates, format variety, assessments, mastery, migration, reports, and quest rotation.

Run the content check directly with `npm run validate-content`. It also runs automatically before every production build.

Players can switch among Kindergarten through Grade 12 at any time without losing their hero, rewards, settings, or earlier grade history. Unlocked map markers enter their realms directly, while locked markers explain the required explorer level. The read-aloud tile can be dragged, moved by keyboard, snapped to any corner, collapsed, and reset.

All progress, assessment evidence, and narrator preferences stay in browser storage on the current device. Narration uses the browser Speech Synthesis API without microphone access or recording; its realism depends on the voices installed by the device or operating system. K World assessments are informal game learning checks, not diagnostic or official school assessments.
