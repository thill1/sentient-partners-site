---
title: "PHP2Shell: what it means for your business website, and what to ask your host"
slug: "php2shell-what-to-ask-your-host"
type: article
date: 2026-11-02
summary: "Two critical PHP flaws let attackers take over a web server without logging in. Updating WordPress doesn't fix them. Here's how to find out if your site is affected, and the email to send your host this week."
reading_minutes: 5
tags: [security, websites, wordpress]
status: draft
---

> If your website runs on WordPress, Joomla, Drupal, or anything built on PHP, this one is worth ten minutes this week.

## What happened

On October 21, the people who maintain PHP released fixes for two critical flaws, now called PHP2Shell (CVE-2026-109618 and CVE-2026-109619). Either one can let an attacker run their own code on a web server with an ordinary web request. No password needed.

PHP sits under roughly 70% of websites, including almost every WordPress site. Every PHP version from the last decade is affected. On October 26, the federal Cybersecurity and Infrastructure Security Agency (CISA) added one of the flaws to its list of vulnerabilities being exploited in the wild.

A few days later a third PHP flaw (CVE-2026-115560) was disclosed. It doesn't have a fix yet, but there is a simple setting change that blocks it.

## Why updating WordPress doesn't help

This is the part most owners miss. The problem is in PHP itself, the software on the server that runs your website, not in WordPress or your plugins. You can have every plugin up to date and still be exposed.

The fix has to happen on the server, which usually means your hosting company.

## Are you affected?

- **Shared or managed WordPress hosting:** probably patched by now, but don't assume. Get it in writing.
- **A VPS or cloud server someone set up for you:** whoever manages that server has to patch it. If nobody does, that's the answer.
- **Wix, Squarespace, Shopify, Webflow:** the platform handles PHP for you, if it uses it at all.
- **A plain HTML or modern static site:** not affected, unless a separate PHP contact form or booking script runs alongside it.

## The email to send your host

Copy this, fill in your domain, and send it to your host's support:

*Please confirm in writing that the server hosting [yourdomain.com] has been updated for CVE-2026-109618 and CVE-2026-109619 (PHP2Shell). Which PHP version and build is running, and when was it updated and restarted? Also, is session.upload_progress disabled as the interim fix for CVE-2026-115560?*

A version number alone isn't proof. Some hosts apply fixes without changing it, so ask for the build date or a changelog entry.

## Three more things worth doing this week

1. **Look for strangers.** Check your site's admin users for anyone you don't recognize, and make sure your contact form still sends to your inbox.
2. **Turn on two-factor sign-in** for your hosting account and your site's admin, and remove old logins from past developers.
3. **Restore one backup on purpose.** A backup you've never restored from is a guess.

If your site runs PHP 8.1 or older, plan an upgrade. Those versions don't get security fixes anymore, for this flaw or the next one.

## The bigger picture

These flaws sat in PHP for more than a decade. They were found with the help of AI tools, and one security team rediscovered them in a single night. Expect more of these, faster. The businesses that do fine are the ones who know what their site runs on, who's responsible for patching it, and how to check.

Our free website check now includes a short security section that looks at what your homepage shares publicly, including signs of an outdated PHP version: [run it here](/tools/#website-check). If you'd like someone to confirm your host's patches and review your access and backups, that's a conversation we're glad to have.

## Sources

- PHP security release, October 21, 2026 (PHP 8.5.12, 8.4.27, 8.3.36, 8.2.35)
- Palo Alto Networks Unit 42, PHP2Shell threat brief
- watchTowr, PHP2Shell FAQ (CISA Known Exploited Vulnerabilities listing, October 26)
- Datadog Security Labs, PHP2Shell analysis
- SOC Prime, CVE-2026-115560 advisory
