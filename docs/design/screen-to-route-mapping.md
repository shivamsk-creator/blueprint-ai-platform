# Screen-to-Route Mapping & Design System Specification (P00-01)

## 1. Approved Route Inventory (All 35 Workbook Routes + Landing & Onboarding)

| Route Pattern | App Router Segment | Access Policy | Core UI Components |
| :--- | :--- | :--- | :--- |
| `/` | `app/page.tsx` | Public | Landing & Studio Entry |
| `/sign-in` | `app/(auth)/sign-in/page.tsx` | Public | Auth Card, FeedbackBanner |
| `/sign-up` | `app/(auth)/sign-up/page.tsx` | Public | Registration Card |
| `/forgot-password` | `app/(auth)/forgot-password/page.tsx` | Public | Password Recovery Card |
| `/onboarding` | `app/(app)/onboarding/page.tsx` | Authenticated | Workspace Onboarding Form |
| `/dashboard` | `app/(app)/dashboard/page.tsx` | Authenticated | `AppShell`, `MetricTile`, `StatusBadge` |
| `/projects` | `app/(app)/projects/page.tsx` | Workspace member | `AppShell`, `DataTable`, `StatusBadge` |
| `/projects/new` | `app/(app)/projects/new/page.tsx` | Contributor+ | Project Charter Form |
| `/projects/[projectId]` | `app/(app)/projects/[projectId]/page.tsx` | Project member | `ProjectSidebar`, `MetricTile`, Lifecycle Stepper |
| `/projects/[projectId]/discovery` | `.../discovery/page.tsx` | Contributor+ | `FileUploader`, `AITaskPanel`, `JobStatus` |
| `/projects/[projectId]/discovery/questions` | `.../discovery/questions/page.tsx` | Contributor+ | Clarification Q&A Cards, `StatusBadge` |
| `/projects/[projectId]/knowledge` | `.../knowledge/page.tsx` | Project member | `DataTable`, `RequirementDrawer`, Provenance Cards |
| `/projects/[projectId]/requirements/[requirementId]` | `.../requirements/[requirementId]/page.tsx` | Project member | Requirement Detail & Revision Timeline |
| `/projects/[projectId]/decisions` | `.../decisions/page.tsx` | Project member | Decision Register Cards |
| `/projects/[projectId]/artifacts/[artifactType]` | `.../artifacts/[artifactType]/page.tsx` | Project member | `ArtifactEditor`, `VersionDiff`, `AITaskPanel`, `ProviderSelector` |
| `/projects/[projectId]/scope` | `.../scope/page.tsx` | Contributor+ | MVP Scope Buckets (`mvp`, `phase_2`, `deferred`, `excluded`) |
| `/projects/[projectId]/ux` | `.../ux/page.tsx` | Project member | Personas, Journeys, Screen Inventory |
| `/projects/[projectId]/architecture` | `.../architecture/page.tsx` | Project member | `ArchitectureCanvas`, ADR Cards |
| `/projects/[projectId]/database` | `.../database/page.tsx` | Project member | `ERDCanvas`, SQL Migration Draft Viewer |
| `/projects/[projectId]/api` | `.../api/page.tsx` | Project member | `DataTable`, OpenAPI 3.1 Spec & Validator |
| `/projects/[projectId]/development` | `.../development/page.tsx` | Project member | `DataTable`, Task Form |
| `/projects/[projectId]/qa` | `.../qa/page.tsx` | Project member | `DataTable`, Test Case Form |
| `/projects/[projectId]/traceability` | `.../traceability/page.tsx` | Project member | `TraceabilityMatrix`, Link Creator |
| `/projects/[projectId]/validation` | `.../validation/page.tsx` | Project member | `ValidationIssueList`, `JobStatus`, `MetricTile` |
| `/projects/[projectId]/changes` | `.../changes/page.tsx` | Manager+ | Change Requests & Downstream Impact List |
| `/projects/[projectId]/reviews` | `.../reviews/page.tsx` | Reviewer+ | `ApprovalPanel` |
| `/projects/[projectId]/history` | `.../history/page.tsx` | Project member | Cross-Artifact Revision Log, `VersionDiff` |
| `/projects/[projectId]/activity` | `.../activity/page.tsx` | Project member | `DataTable` (Audit Feed) |
| `/projects/[projectId]/exports` | `.../exports/page.tsx` | Project member | Export Job Trigger, `JobStatus`, Private Downloads |
| `/settings/general` | `.../settings/general/page.tsx` | Admin+ | Workspace Settings Form |
| `/settings/members` | `.../settings/members/page.tsx` | Admin+ | Team Table, Invitation Form |
| `/settings/ai-providers` | `.../settings/ai-providers/page.tsx` | Admin+ | Encrypted Provider Form, Test & Rotate Controls |
| `/settings/ai-models` | `.../settings/ai-models/page.tsx` | Admin+ | Model Catalogue & Per-Task Policy Matrix |
| `/settings/ai-usage` | `.../settings/ai-usage/page.tsx` | Admin+ | Usage Metrics & Model/Task Cost Tables |
| `/settings/audit` | `.../settings/audit/page.tsx` | Admin+ | Append-Only Audit Trail Table |
| `/templates` | `.../templates/page.tsx` | Authenticated | Blueprint Template Cards |
| `/ai-usage` | `.../ai-usage/page.tsx` | Authenticated | Workspace AI Usage Overview |

## 2. Approved Design System (Architectural Blueprint Studio)

The **Architectural Blueprint Studio** design system in `packages/ui/src/tokens.css` (`--bp-canvas`, `--bp-surface`, `--bp-chrome`, `--bp-accent`, semantic status tokens, tabular numerals, radii, and shadows) is approved as the finalized visual baseline for Blueprint AI MVP.
