# Security policy

## Reporting a vulnerability

**Do not open a public issue.** A public report gives every consumer of this
package a working exploit before there is anything to upgrade to.

Report privately through GitHub's
[security advisory form](https://github.com/ecoma-io/loom/security/advisories/new).
If that is unavailable to you, email **john.itvn@gmail.com** with `SECURITY` in
the subject line.

Please include:

- what an attacker can do, and what they need in order to do it;
- the affected version or commit;
- a reproduction — the smaller the better.

## What to expect

This project is maintained by one person, so these are honest targets rather
than a contractual guarantee:

| Stage                        | Target         |
| ---------------------------- | -------------- |
| Acknowledgement              | within 3 days  |
| Initial assessment           | within 7 days  |
| Fix or documented mitigation | within 30 days |

You will be told which of those applies as soon as the assessment is done,
including when the answer is that the report is not a vulnerability.

## Scope

In scope: the published `@ecoma-io/loom` package, this repository's source, and
its build and release workflows.

Out of scope: vulnerabilities in third-party dependencies with no exploitable
path through this package — report those upstream — and findings that require
an attacker to already control the consuming application.

## Disclosure

Fixes are released before details are published. Credit goes to the reporter
unless you ask otherwise.
