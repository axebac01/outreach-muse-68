# Technical decisions

- Email templates support `{{greeting}}`, rendered as `Hej Förnamn,` when a name exists and `Hej,` otherwise, so mixed lead lists never produce malformed greetings.