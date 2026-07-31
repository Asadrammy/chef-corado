# Menu System Deprecation Note

The active chef menu flow is free-form only:

- title
- cuisine/category
- one large menu description
- image
- optional event metadata
- optional positive price

`MenuSection` and `MenuItem` remain in the Prisma schema only for legacy data compatibility. Active dashboard UI, active menu APIs, and public chef APIs must not require or expose section/item builder payloads.

Legacy menu records with `menuType` values such as `PRICED` or `SAMPLE` may remain readable. New active dashboard submissions use `FREE_FORM`; if a price is blank, public pages should show request-based pricing text instead of a zero-value currency amount.
