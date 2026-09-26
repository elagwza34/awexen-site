# Hostinger SSH incident findings — 2026-09-05

Scope: authorized read-only investigation of 13 WordPress sites under the supplied hosting account. SSH access succeeded. No production files or database records were changed, no credentials were rotated, and no backup was restored.

## Confirmed evidence

- 21 files named scope-extension-ultra.php were found: ordinary plugin copies on all 13 sites and MU-plugin copies on 8 sites.
- The arabadu.org MU-plugin sample was statically decoded using PHP tokenization and character substitution. The suspect source was never included, evaluated, or run.
- Sample SHA-256: 3f11e54e6e80244a41bb56c7c5dc1818647609fca715ced80d79fd45a145fb3e.
- Decoded lines 5133–5139 create a user with administrator role. The code also filters user listings, authentication, plugin listings, and file-manager connectors; writes PHP files; registers shutdown callbacks; changes file timestamps; and registers sc_cron_guard and sc_cron_fetch.
- Direct database SELECT queries found both sc_cron_guard and sc_cron_fetch in all 13 sites. Config credentials were parsed as literal text inside the server process and were not printed or saved.
- Recent administrator accounts exist on every site. Creation dates and names alone do not establish which accounts are unauthorized; correlate these with malware state and owner knowledge.
- arabadu.org/public_html/wp-plugin.php contains Turkish gambling SEO content using arabadu.org as its canonical site. SHA-256: 6cabb2d0fe252351541d055eae458425dcd8d621a489589f93070d89fd545faf.
- arabadu.org/public_html/init.php is a writable Tiny File Manager instance with configured login accounts and unrestricted upload-extension settings. Its provenance remains unconfirmed. SHA-256: e8e7f6adca227f92d27f159f0ff2f6edc93787664707ce89b1d6eeb20ecc02c0.
- Server-level crontab is absent for the hosting user. This does not cover WordPress scheduled jobs, which are present.
- A narrow text check of all 13 wp-config.php files found no eval/base64_decode/gzinflate/str_rot13 calls. This is not a complete integrity check or clean verdict.

## Limits and cleanup preparation

- The sample's behavior, matching plugin files across sites, and matching database hooks establish a widespread compromise. Only one plugin variant was decoded; other variants and additional persistence paths still require analysis.
- Preserve affected files and relevant database records outside web roots before quarantine.
- Map and isolate all executable persistence paths together, including MU plugins, regular plugins, drop-ins, theme injections and any auto-prepend settings. Do not bootstrap compromised WordPress to perform the investigation.
- Remove confirmed malicious scheduled events and disable confirmed attacker accounts after preserving records; preserve content ownership.
- Replace compromised or vulnerable components from verified official distributions, then recheck recurrence.
- Rotate hosting, SSH/FTP, database and WordPress credentials with corresponding configuration updates. The SSH password disclosed in chat must be replaced; it is intentionally excluded from this report.
- No backup after 2026-08-22 may be restored per user instruction. An older backup is not automatically clean; filesystem timestamps are not reliable infection dates.
- Local endpoint malware scanning remains incomplete. Earlier checks found Defender disabled and security-product registrations, not proof of active protection.
- Full isolation across 13 production sites may require a maintenance window; no outage has been initiated.

## Database inventory

The list below records recent administrator accounts for review, not a deletion list. wpcode_usage_tracking_cron is included by the broad inventory filter and is not classified as malware.

```json
[
  {
    "site": "3dex.com.sa",
    "config_obfuscation_indicators": 0,
    "recent_admins": [
      {
        "ID": "6",
        "user_login": "backup_49d75a8af5",
        "user_registered": "2026-09-05 14:35:24"
      }
    ],
    "flagged_cron_hooks": [
      "sc_cron_guard",
      "sc_cron_fetch",
      "wpcode_usage_tracking_cron"
    ],
    "scope_option_count": 25
  },
  {
    "site": "agozaweb.com",
    "config_obfuscation_indicators": 0,
    "recent_admins": [
      {
        "ID": "9",
        "user_login": "admin_61b76d5bb7",
        "user_registered": "2026-09-05 02:09:33"
      }
    ],
    "flagged_cron_hooks": [
      "sc_cron_guard",
      "sc_cron_fetch"
    ],
    "scope_option_count": 28
  },
  {
    "site": "amoneex.com",
    "config_obfuscation_indicators": 0,
    "recent_admins": [
      {
        "ID": "23",
        "user_login": "backup_b8ce7eeca5",
        "user_registered": "2026-09-04 06:21:31"
      }
    ],
    "flagged_cron_hooks": [
      "sc_cron_guard",
      "sc_cron_fetch"
    ],
    "scope_option_count": 24
  },
  {
    "site": "arabadu.org",
    "config_obfuscation_indicators": 0,
    "recent_admins": [
      {
        "ID": "7",
        "user_login": "site_manager",
        "user_registered": "2026-08-22 23:30:43"
      },
      {
        "ID": "8",
        "user_login": "bot",
        "user_registered": "2026-08-24 13:52:54"
      },
      {
        "ID": "9",
        "user_login": "administrator_de28c20d28",
        "user_registered": "2026-08-24 23:55:28"
      },
      {
        "ID": "10",
        "user_login": "sage17156",
        "user_registered": "2026-08-27 08:45:30"
      },
      {
        "ID": "11",
        "user_login": "arabadu.org",
        "user_registered": "2026-08-28 11:05:14"
      },
      {
        "ID": "13",
        "user_login": "adminJCeN",
        "user_registered": "2026-08-30 11:03:51"
      }
    ],
    "flagged_cron_hooks": [
      "sc_cron_guard",
      "sc_cron_fetch",
      "wpcode_usage_tracking_cron"
    ],
    "scope_option_count": 25
  },
  {
    "site": "avanco.agozaweb.com",
    "config_obfuscation_indicators": 0,
    "recent_admins": [
      {
        "ID": "3",
        "user_login": "adm_f1ed552f48",
        "user_registered": "2026-09-04 07:03:09"
      }
    ],
    "flagged_cron_hooks": [
      "sc_cron_guard",
      "sc_cron_fetch"
    ],
    "scope_option_count": 25
  },
  {
    "site": "elfarouk-store.agozaweb.com",
    "config_obfuscation_indicators": 0,
    "recent_admins": [
      {
        "ID": "6",
        "user_login": "administrator_521163830e",
        "user_registered": "2026-09-04 06:58:27"
      }
    ],
    "flagged_cron_hooks": [
      "sc_cron_guard",
      "sc_cron_fetch"
    ],
    "scope_option_count": 28
  },
  {
    "site": "elsayehgroup.com",
    "config_obfuscation_indicators": 0,
    "recent_admins": [
      {
        "ID": "3",
        "user_login": "adm_e163a22171",
        "user_registered": "2026-09-04 06:35:12"
      }
    ],
    "flagged_cron_hooks": [
      "sc_cron_guard",
      "sc_cron_fetch"
    ],
    "scope_option_count": 20
  },
  {
    "site": "englishforjob.com",
    "config_obfuscation_indicators": 0,
    "recent_admins": [
      {
        "ID": "15",
        "user_login": "administrator_09b91050da",
        "user_registered": "2026-09-04 06:58:10"
      }
    ],
    "flagged_cron_hooks": [
      "sc_cron_guard",
      "sc_cron_fetch"
    ],
    "scope_option_count": 12
  },
  {
    "site": "fekra.agozaweb.com",
    "config_obfuscation_indicators": 0,
    "recent_admins": [
      {
        "ID": "14",
        "user_login": "admin_01b850d5d0",
        "user_registered": "2026-09-04 07:06:38"
      }
    ],
    "flagged_cron_hooks": [
      "sc_cron_guard",
      "sc_cron_fetch"
    ],
    "scope_option_count": 28
  },
  {
    "site": "lilydecoration.com",
    "config_obfuscation_indicators": 0,
    "recent_admins": [
      {
        "ID": "8",
        "user_login": "backup_90172f25fb",
        "user_registered": "2026-09-05 14:35:05"
      }
    ],
    "flagged_cron_hooks": [
      "sc_cron_guard",
      "sc_cron_fetch",
      "wpcode_usage_tracking_cron"
    ],
    "scope_option_count": 27
  },
  {
    "site": "misr-edu.com",
    "config_obfuscation_indicators": 0,
    "recent_admins": [
      {
        "ID": "4",
        "user_login": "administrator_9ff7ca2d2d",
        "user_registered": "2026-09-04 06:52:39"
      }
    ],
    "flagged_cron_hooks": [
      "sc_cron_guard",
      "sc_cron_fetch"
    ],
    "scope_option_count": 16
  },
  {
    "site": "reno-va.com",
    "config_obfuscation_indicators": 0,
    "recent_admins": [
      {
        "ID": "3",
        "user_login": "adm_6b5ce456d2",
        "user_registered": "2026-09-04 06:23:19"
      }
    ],
    "flagged_cron_hooks": [
      "sc_cron_guard",
      "sc_cron_fetch"
    ],
    "scope_option_count": 22
  },
  {
    "site": "vagory.com",
    "config_obfuscation_indicators": 0,
    "recent_admins": [
      {
        "ID": "30",
        "user_login": "admin_0db590d23b",
        "user_registered": "2026-09-05 14:52:56"
      }
    ],
    "flagged_cron_hooks": [
      "sc_cron_guard",
      "sc_cron_fetch",
      "wpcode_usage_tracking_cron"
    ],
    "scope_option_count": 28
  }
]
```

