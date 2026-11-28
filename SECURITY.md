# Security

Bowl & Belly guards a household's data behind a single password, so security reports are very welcome.

## Reporting a vulnerability

Please report vulnerabilities privately, not in a public issue, pull request or discussion.

Use GitHub's private vulnerability reporting: go to the [Security tab](https://github.com/romainveillard/bowl-and-belly/security) and choose **Report a vulnerability**, or open the [new advisory form](https://github.com/romainveillard/bowl-and-belly/security/advisories/new) directly. Only you and the maintainers can see it.

Please include:

- the version (shown in Settings, under About) or the image tag
- how the instance is set up: password or not, `BOWL_HOSTS`, `BOWL_TRUST_PROXY`, and any reverse proxy or tunnel in front of it
- the steps to reproduce, and what an attacker gains

You'll get a reply in the advisory. Once a fix is released, the advisory is published with credit to you, unless you'd rather not be named.

## Supported versions

Fixes go into the latest release and the `edge` image. Older releases aren't patched, so upgrade to get a fix.

## Scope

In scope, for example:

- getting past the login, or keeping a session after the password has changed or the session should have ended
- reaching a password-less instance from a web page through a host name not listed in `BOWL_HOSTS`
- reading or changing data, or the backups, without being logged in
- anything an uploaded image or a crafted request can do beyond what the app means it to

Out of scope:

- an instance exposed to the internet without a password, which the README warns against
- the public demo's data, which is shared with every visitor by design
- reports from automated scanners without a way to exploit them
