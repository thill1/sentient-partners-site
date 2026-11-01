---
title: "Fed holds, diesel climbs: price clearly and patch your remote tools"
slug: "issue-05-fed-holds-diesel-climbs"
issue: 5
date: 2026-11-04
summary: "The Fed held and two voters wanted a hike. Diesel is up $2.63 a gallon from last year. Shoppers plan to spend at small businesses but doubt price hikes. Here is what to do this fortnight."
reading_minutes: 5
status: approved
type: newsletter
---

## Owner signal

The economy is growing. Your customers' paychecks are not keeping up.

The Fed held its target range at 3.75% to 4% on Oct 28. Two of the twelve voters wanted another quarter point hike, and the statement says inflation "remains elevated." The next meeting is Dec 8 to 9. Do not plan Q1 around a rate cut. Plan around today's rate, with room for one more hike.

Growth looks strong on paper. BEA's first estimate puts third quarter GDP up 3.4% at an annual rate, up from 2.2% in the second quarter. But the September income report tells the household story. Prices (the PCE index) rose 0.5% in September and 3.6% over the year. After taxes and inflation, personal income fell 0.3% for the month, and the saving rate is 3.8%. People are still spending. They have less cushion to do it with.

Fuel split in October. EIA's weekly average for regular gas eased from $4.33 on Oct 12 to $4.27 on Oct 26. Diesel went the other way, from $6.18 to $6.35, and is $2.63 a gallon higher than a year ago. If your trucks, equipment, or deliveries run on diesel, last issue's repricing is not done.

**Thesis: demand is there, but customers are stretched and skeptical. Price clearly, make paying easy, keep your Google listing accurate before you let any automated tool answer for you, and get three security answers from whoever runs your tech.**

## Holiday ops: clear prices, easy payment, an accurate Google listing

**Demand is real.** In its holiday survey, a vendor survey fielded in August, Intuit QuickBooks polled about 1,000 small business decision makers and 6,000 consumers. Shoppers plan to send about $118 billion of holiday spending to small businesses, and 76% of owners expect more revenue than last season.

**Shoppers do not trust price increases.** In the same QuickBooks vendor survey, 38% of small businesses have raised prices or plan to, and another 43% are thinking about it. Only 9% of shoppers think price increases are fully justified, and 49% say they are not really or not at all justified. 41% expect higher shipping and delivery costs this season.

What to do with that:

1. If you raise a price, say why in one plain sentence ("diesel is up $2.63 a gallon from last year"). A clear reason beats a quiet increase.
2. Put the trip fee, delivery fee, or minimum on the quote up front. Surprise fees are what shoppers call gouging.
3. Make paying easy. Younger customers lean on pay-later options more than older ones (about 21% to 24% of Gen Z and Millennial shoppers in the survey). Text-to-pay and card on file remove a reason to wait.

**Google's texting agent is reportedly reaching more businesses.** Search Engine Roundtable reported on Oct 29 that Google is inviting more businesses into a free AI messaging pilot for Business Profiles, citing Google's invite email and welcome screen. Google has not published a help page on it yet, so treat the details as reported, not confirmed. As described, customers text your business from Search and Maps in their phone's normal texting app. An AI agent answers routine questions, and hands off anything it cannot answer. You can take over any conversation. It only works for customers whose phones and carriers support RCS (the newer texting standard). Everyone else's texts go straight to your phone. According to the report, invited businesses see a red dot on Messages in their profile.

AI used well here: you fix your hours, services, prices, and booking link first, read a week of conversations, and decide who on your team watches the handoffs. AI used poorly: you switch it on with last year's holiday hours and let it promise a Saturday slot you do not have. The agent can only answer as well as your profile does.

## Security: three questions for whoever runs your tech

Late October was busy. Most of it is not your problem. Three things might be.

**1. The remote support tool your IT provider uses.** BeyondTrust Remote Support (formerly Bomgar) had a critical flaw that attackers used for weeks before a fix shipped. BeyondTrust patched its cloud customers automatically. Self-hosted systems need the patch applied by hand. Mandiant, the security firm that investigated, says any system that sat on the internet unpatched should be treated as possibly broken into until someone checks. If an outside company remotes into your computers, ask what tool they use and whether it is patched.

**2. Your website's server.** PHP, the software behind most WordPress sites and many online stores, shipped emergency fixes on Oct 21 for two critical flaws, and CISA lists both as exploited. Most big hosts say they have patched. If you use a managed host, a one-line email confirms it. If someone runs your site on their own server, ask them directly.

**3. Your firewall and VPN.** CISA added more exploited flaws in Ivanti Connect Secure (Oct 30) and Cisco firewall VPN software (Oct 29), plus Fortinet earlier in the month. Same question as last issue: "Do we run any of these, and are they patched?"

**Holiday payment fraud.** This is the season for fake invoices, "new bank details" emails, and fake delivery texts. Make a rule now: no change to a vendor's or employee's bank details without a call to a number you already have on file, not one in the email.

Plain English checklist:

1. Ask your IT provider: remote support tool patched? Firewall and VPN patched?
2. Ask your web host or developer: PHP updated after Oct 21?
3. Keep MFA on email, banking, payroll, and remote access.
4. Test one restore from backup before the holiday rush.
5. Next Windows updates land Tuesday, Nov 10. Plan the restart.

If something looks wrong (strange login prompts, locked files, money moved that you did not approve), call your bank first if money moved, then your IT provider. Report it to the FBI at ic3.gov or call CISA at 1-844-Say-CISA.

## Sentient Partners angle

When customers are stretched, the businesses that win the season are the ones that are easy to reach, clear on price, and quick to reply.

That is where we start with owners. Strategy first, then the right tools to carry it. We help growing businesses pick and set up the right tools for calls, texts, booking, follow-up, and pay by text, and we keep websites and Google profiles accurate so anything that answers for you has the right facts. You approve everything before it goes out.

## Sources

- Federal Reserve FOMC statement, Oct 28, 2026: https://www.federalreserve.gov/newsevents/pressreleases/monetary20261028a.htm
- BEA GDP advance estimate, Q3 2026: https://www.bea.gov/news/2026/gdp-advance-estimate-3rd-quarter-2026
- BEA Personal Income and Outlays, September 2026: https://www.bea.gov/news/2026/personal-income-and-outlays-september-2026
- EIA Gasoline and Diesel Fuel Update: https://www.eia.gov/petroleum/gasdiesel/
- Intuit QuickBooks Small Business Holiday Shopping Survey 2026: https://quickbooks.intuit.com/r/small-business-data/holiday-shopping-survey/
- Google Business Profile AI-powered messaging pilot expanding: https://www.seroundtable.com/google-business-profiles-ai-powered-messaging-42419.html
- BeyondTrust advisory BT26-05, CVE-2026-102764: https://www.beyondtrust.com/trust-center/security-advisories/bt26-05
- PHP2Shell, CVE-2026-109618 and CVE-2026-109619: https://www.bleepingcomputer.com/news/security/php-ships-emergency-patches-for-critical-php2shell-flaws/
- CISA KEV additions, Cisco and GitLab, Oct 29, 2026: https://www.cisa.gov/news-events/alerts/2026/10/29/cisa-adds-two-known-exploited-vulnerabilities-catalog
- CISA alert on BeyondTrust Remote Support, Oct 16, 2026: https://www.cisa.gov/news-events/alerts/2026/10/16/cisa-urges-patching-critical-vulnerability-beyondtrust-remote-support
- CISA KEV additions, PHP, Oct 26, 2026: https://www.cisa.gov/news-events/alerts/2026/10/26/cisa-adds-two-known-exploited-vulnerabilities-catalog
- CISA KEV additions, Ivanti Connect Secure, Oct 30, 2026: https://www.cisa.gov/news-events/alerts/2026/10/30/cisa-adds-two-known-exploited-vulnerabilities-catalog
