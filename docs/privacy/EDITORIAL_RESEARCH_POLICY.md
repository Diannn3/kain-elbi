# Editorial / Freshie Research Privacy Policy

Purpose: learn about food places and student-relevant dining context, not profile the people discussing those places.

## May retain
- place/business name;
- place ID;
- category or factual recommendation signal;
- publication/research date;
- public source URL;
- source type/authority/access level;
- aggregate evidence notes written by the researcher.

## Do not retain in generated editorial datasets
- usernames/handles;
- author/commenter IDs;
- avatars;
- profile URLs;
- raw scraped comments;
- unnecessary verbatim quotes;
- screenshots containing account/profile information.

## Collection boundary
- Do not bypass authentication or access controls.
- Restrict automated collection to genuinely public material.
- Review new source types in the PIA before automating them.
- If a public post contains a useful place fact and personal data, extract the place fact and discard the personal identifiers.

CI runs `npm run audit:editorial-privacy` to catch common personal-profile fields/URLs.
