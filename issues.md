#789 Add Budget Utilization Bands
Repo Avatar
stellarspend/stellarspend-contracts
Problem

Budget utilization lacks standardized classifications.

Scope
Add utilization levels:
Low
Moderate
High
Critical

Acceptance Criteria
Levels calculated correctly
Query API exposes utilization band

#788 Implement Goal Funding Deadline Alerts
Repo Avatar
stellarspend/stellarspend-contracts
Problem

Users receive no indication that a savings deadline is approaching.

Scope
Emit reminder events
Support configurable alert thresholds

Acceptance Criteria
Alerts generated before deadline
Duplicate alerts prevented

#792 Implement Contribution Retry Protection
Repo Avatar
stellarspend/stellarspend-contracts
Problem

Repeated transaction submissions may create duplicate deposits.

Scope
Add idempotency token support
Reject duplicate requests

Acceptance Criteria
Duplicate contributions prevented
Original transaction preserved

#790 Implement Scheduled Budget Archiving
Repo Avatar
stellarspend/stellarspend-contracts
Problem

Expired budgets remain in active storage indefinitely.

Scope
Automatically archive inactive budgets
Preserve historical records

Acceptance Criteria
Archiving executes after configured period
Archived budgets remain queryable