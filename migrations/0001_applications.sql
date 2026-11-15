-- Job applications shown on /dashboard. Written by POST /api/applications.
CREATE TABLE IF NOT EXISTS applications (
  id          TEXT PRIMARY KEY,
  applied_at  TEXT NOT NULL,              -- YYYY-MM-DD
  company     TEXT NOT NULL,
  role        TEXT NOT NULL,
  platform    TEXT NOT NULL DEFAULT '',
  location    TEXT NOT NULL DEFAULT '',
  work_type   TEXT NOT NULL DEFAULT '',   -- Onsite | Hybrid | Remote
  seniority   TEXT NOT NULL DEFAULT '',
  source_url  TEXT NOT NULL DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'Applied'
              CHECK (status IN ('Applied', 'Viewed', 'Assessment', 'Interview', 'Offer', 'Rejected', 'Ghosted')),
  last_update TEXT NOT NULL,              -- YYYY-MM-DD
  notes       TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_applications_applied_at ON applications (applied_at);
