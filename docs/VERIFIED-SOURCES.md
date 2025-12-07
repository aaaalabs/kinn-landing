# KINN-RADAR Verified Sources

## ✅ Verified & Working

| Source | URL | Status | Last Checked |
|--------|-----|--------|--------------|
| **InnCubator** | https://www.inncubator.at/events | ✅ Working | Dec 2024 |
| **WKO Tirol** | https://www.wko.at/veranstaltungen/start?bundesland=T | ✅ Working | Dec 2024 |
| **Startup.Tirol** | https://www.startup.tirol/events/ | ✅ Working | Dec 2024 |
| **Innsbruck.info** | https://www.innsbruck.info/brauchtum-und-events/veranstaltungskalender.html | ✅ Fixed URL | Dec 2024 |
| **MCI** | https://www.mci4me.at/de/events | ✅ Fixed URL | Dec 2024 |
| **FH Kufstein** | https://www.fh-kufstein.ac.at/service/events | ✅ Fixed URL | Dec 2024 |

## ⚠️ Need Verification

| Source | URL | Issue |
|--------|-----|-------|
| **AI Austria** | https://aiaustria.com/event-calendar | Need to verify events page |
| **Standortagentur Tirol** | https://www.standort-tirol.at/veranstaltungen | Need to verify |
| **Impact Hub Tirol** | https://tirol.impacthub.net/en/collection/?_sf_tag=upcoming-events | Complex URL |
| **Uni Innsbruck** | https://www.uibk.ac.at/events/ | Need to verify |
| **LSZ** | https://lsz.at/ | Main page exists, events unclear |
| **Werkstätte Wattens** | https://www.werkstaette-wattens.at | Site exists |
| **Das Wundervoll** | https://www.daswundervoll.at/en/about-wundervoll/events | Redirects |
| **Die Bäckerei** | https://diebaeckerei.at/programm | Need to verify |
| **WeLocally Innsbruck** | https://innsbruck.welocally.at/region/treffen | Site exists |
| **DIH West** | https://www.dih-west.at/events | Redirects |
| **Congress Messe Innsbruck** | https://www.cmi.at/de/veranstaltungskalender | Need to verify |
| **Meetup Innsbruck** | https://www.meetup.com/find/at--innsbruck/ | Complex, needs login |
| **Engineering Kiosk Alps** | https://engineeringkiosk.dev/meetup/alps/ | Need to verify |

## ❌ Removed (Don't Exist)

| Source | Issue |
|--------|-------|
| **Coworking Tirol** | Domain coworking-tirol.com does not exist |

## Notes

### URL Verification Status
- Many URLs were assumed/guessed and not actually tested
- Some redirects might lead to different pages
- Event pages might be behind authentication
- Some sites might not have dedicated event pages

### Testing Methodology
```bash
# Quick URL check
curl -I -s -o /dev/null -w "%{http_code}" URL

# 200/301/302 = exists
# 000 = DNS failure
# 404 = page not found
```

### Next Steps
1. Manually visit each "Need Verification" URL
2. Find correct event pages where they exist
3. Remove sources without event pages
4. Update configurations with correct patterns

## Lesson Learned
**Always verify URLs before adding sources!** 🤦‍♂️