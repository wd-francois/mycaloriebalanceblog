# App Map — Original & Pro

Reference doc for everything that makes up both apps: databases, navbars, pages, modals, and APIs — each with a link to its file. See also the visual wireframe (chat artifact) for a plain-language tour.

- **Original** = free, local-first, offline. Files: `src/pages/*.astro` (excl. `pro/`), `src/components/*` (excl. `pro/`).
- **Pro** = cloud-based, sign-in required, coach/client roles. Files: `src/pages/pro/`, `src/components/pro/`, `convex/`.
- **Shared** = used by both apps: `src/layouts/`.

---

## Original App

### Database

Fully local — no network calls, no server API. Two local storage mechanisms:

**IndexedDB** — `HealthTrackerDB`, version `2`. Defined in [src/lib/database.js](src/lib/database.js), which is now the single access point for it — `getAllUserEntries()`, `deleteUserEntry()`, etc. Every page/component reads/writes IndexedDB through this file rather than opening it directly.

| Object store | Keyed by | Indexes | Holds |
|---|---|---|---|
| `foodLibrary` | `id` (auto) | `name`, `category`, `lastUsed` | Saved/custom foods for the meal logger |
| `exerciseLibrary` | `id` (auto) | `name`, `category`, `lastUsed` | Saved/custom exercises |
| `userEntries` | `id` (auto) | `date`, `type` | Logged meals, exercise, activity, sleep entries |
| `measurements` | `id` (auto) | `date` | Body measurements & skinfold entries |
| `entryPhotos` | `id` | `date`, `timestamp` | Gallery / progress photos (binary data) |

**localStorage** — small settings/cache values. `healthEntries` is now read/written exclusively through `database.js`'s `getHealthEntries()`/`saveHealthEntries()` helpers (previously every call site parsed/stringified it by hand); the rest below are still read directly:

| Key | Holds |
|---|---|
| `healthEntries` | Legacy/streak-calculation cache of entries by date ([used on Home](src/pages/index.astro)) — access via [database.js](src/lib/database.js)'s `getHealthEntries()`/`saveHealthEntries()` |
| `mealEntries` | Meal entry cache |
| `mealLibrary` | Meal library cache |
| `measurements` | Measurement cache |
| `healthFormState` | In-progress form values (draft recovery) |
| `healthTrackerSettings` | User preferences (goals, units, etc.) |
| `calorieCalculatorData` | Saved calculator inputs |
| `lastExportDate` | Last time data was exported |
| `theme` | Light/dark mode preference |
| `pwa-installed`, `pwa-prompt-dismissed-until` | PWA install-prompt state |

### Navbar

| Piece | File | Notes |
|---|---|---|
| Top bar | [src/layouts/components/common/TopNavigation.astro](src/layouts/components/common/TopNavigation.astro) | Logo/Home link + embeds `ProNavStatus.jsx` (shared with Pro — see below) |
| Bottom tab bar | [src/layouts/components/common/BottomNavigation.astro](src/layouts/components/common/BottomNavigation.astro) | Tabs: Home, Gallery, Tools, Insights, Settings |

### Pages

| Route | File | Renders | What it's for |
|---|---|---|---|
| `/` | [src/pages/index.astro](src/pages/index.astro) | [DateTimeSelector.jsx](src/components/DateTimeSelector.jsx) | Home — daily hub, date picker, quick links to add/view entries |
| `/add-meal` | [src/pages/add-meal.astro](src/pages/add-meal.astro) | [AddMealForm.jsx](src/components/AddMealForm.jsx) | Log a meal |
| `/add-measurement` | [src/pages/add-measurement.astro](src/pages/add-measurement.astro) | [AddMeasurementsFormPage.jsx](src/components/AddMeasurementsFormPage.jsx) | Log body measurements |
| `/add-sleep` | [src/pages/add-sleep.astro](src/pages/add-sleep.astro) | [AddSleepForm.jsx](src/components/AddSleepForm.jsx) | Log sleep |
| `/entries` | [src/pages/entries.astro](src/pages/entries.astro) | [DailyEntries.jsx](src/components/DailyEntries.jsx) | View Entries — full log for a day |
| `/daily-calories` | [src/pages/daily-calories.astro](src/pages/daily-calories.astro) | self-contained | Daily calorie intake detail/chart |
| `/daily-weight` | [src/pages/daily-weight.astro](src/pages/daily-weight.astro) | self-contained | Weight progress detail/chart |
| `/daily-sleep` | [src/pages/daily-sleep.astro](src/pages/daily-sleep.astro) | self-contained | Sleep statistics detail/chart |
| `/statistics` | [src/pages/statistics.astro](src/pages/statistics.astro) | self-contained | Long-term stats overview |
| `/gallery` | [src/pages/gallery.astro](src/pages/gallery.astro) | [PhotoGallery.jsx](src/components/PhotoGallery.jsx) | Progress photo gallery |
| `/tools` | [src/pages/tools.astro](src/pages/tools.astro) | self-contained | Tools hub — links to calculators/library below |
| `/calorie-calculator` | [src/pages/calorie-calculator.astro](src/pages/calorie-calculator.astro) | self-contained | Calorie needs calculator |
| `/protein-calculator` | [src/pages/protein-calculator.astro](src/pages/protein-calculator.astro) | [ProteinCalorieCalculator.jsx](src/components/ProteinCalorieCalculator.jsx) | Protein needs calculator |
| `/kilojoule-converter` | [src/pages/kilojoule-converter.astro](src/pages/kilojoule-converter.astro) | [KilojouleConverter.jsx](src/components/KilojouleConverter.jsx) | kcal ⇄ kJ converter |
| `/portion-guide` | [src/pages/portion-guide.astro](src/pages/portion-guide.astro) | self-contained | Hand portion-size reference guide |
| `/exercise-library` | [src/pages/exercise-library.astro](src/pages/exercise-library.astro) | [ExerciseLibraryManager.jsx](src/components/ExerciseLibraryManager.jsx) | Browse/manage saved exercises |
| `/library` | [src/pages/library.astro](src/pages/library.astro) | [LibraryManager.jsx](src/components/LibraryManager.jsx) | Browse/manage saved foods |
| `/helpful-links` | [src/pages/helpful-links.astro](src/pages/helpful-links.astro) | self-contained | About / helpful external links |
| `/insights` | [src/pages/insights.astro](src/pages/insights.astro) | self-contained | Insights overview |
| `/insights/[category]` | [src/pages/insights/[category].astro](src/pages/insights/%5Bcategory%5D.astro) | self-contained | Insights drilldown by category |
| `/settings` | [src/pages/settings.astro](src/pages/settings.astro) | [Settings.jsx](src/components/Settings.jsx) | Goals, units, preferences |
| `/export` | [src/pages/export.astro](src/pages/export.astro) | [ExportManager.jsx](src/components/ExportManager.jsx) | Export your data |
| `/help-page` | [src/pages/help-page.astro](src/pages/help-page.astro) | self-contained | Help & Guide (linked from Home) |
| `/features` | [src/pages/features.astro](src/pages/features.astro) | self-contained | Public marketing/info page, not part of daily use |

Dev/test-only pages that existed at one point (`add-meal-preview.astro`, `food-logger-test.astro`, `test-navbar.astro`, plus their dead dependency `newMealForm.jsx`) have since been deleted as part of a codebase cleanup — confirmed unreferenced from any nav or other page before removal. [help.astro](src/pages/help.astro) still exists as an older duplicate of `help-page.astro`.

### Modals

`DateTimeSelector.jsx` (the Home-screen Add/Edit modal host) was split up — its pieces now live in [src/components/dateTimeSelector/](src/components/dateTimeSelector/):

| Modal | File | Opens from | What it's for |
|---|---|---|---|
| Info popup | [src/components/HealthTracker/InfoModal.jsx](src/components/HealthTracker/InfoModal.jsx) | HealthTracker entry forms | Contextual help/info popover |
| Entry info modal | [dateTimeSelector/InfoModal.jsx](src/components/dateTimeSelector/InfoModal.jsx) | Home (`/`) | Add/edit freeform notes on an existing entry |
| Settings modal | [dateTimeSelector/SettingsModal.jsx](src/components/dateTimeSelector/SettingsModal.jsx) | Home (`/`) | Weight/length units, date/time format, AI assistant prefs |
| Entry type picker | [dateTimeSelector/EntryTypeButtons.jsx](src/components/dateTimeSelector/EntryTypeButtons.jsx) | Home (`/`), inside the Add/Edit modal | Meal/Sleep/Measure link out to their own pages; Exercise opens inline |
| Photo attach | [dateTimeSelector/PhotoAttachSection.jsx](src/components/dateTimeSelector/PhotoAttachSection.jsx) | Home (`/`), inside the Add/Edit modal | Attach/preview/save a photo, independent of entry type |
| Meal edit form | [dateTimeSelector/MealFormFields.jsx](src/components/dateTimeSelector/MealFormFields.jsx) | Home (`/`), when editing an existing meal | Inline meal add/edit fields |
| Exercise section | [dateTimeSelector/ExerciseSection.jsx](src/components/dateTimeSelector/ExerciseSection.jsx) | Home (`/`), inside the Add/Edit modal | Wraps the shared `ExerciseForm.jsx` builder with date/time |
| Add/edit food modal (inline) | [src/components/LibraryManager.jsx](src/components/LibraryManager.jsx) | `/library` | Add or edit a saved food item |
| Add/edit exercise modal (inline) | [src/components/ExerciseLibraryManager.jsx](src/components/ExerciseLibraryManager.jsx) | `/exercise-library` | Add or edit a saved exercise |

Note: editing an existing **sleep** or **measurements** entry sets internal flags expecting an inline form, but no such form exists in the current render — this looks like a pre-existing gap, not something introduced by the above split.

### APIs

None. The Original app never calls `fetch()` — everything reads/writes straight to IndexedDB and localStorage on-device (see Database above).

---

## Pro App

### Database

**Convex** — cloud document database with live/reactive queries + built-in file storage. Schema: [convex/schema.ts](convex/schema.ts). Shared backend helpers (auth/relationship checks, notification coalescing, email lookup) live in [convex/lib.ts](convex/lib.ts) and are imported by the API modules below rather than reimplemented per-file.

| Table | Holds | Key fields |
|---|---|---|
| `entries` | Meal/exercise/activity/sleep/measurement logs (cloud equivalent of Original's `userEntries`) | `userId`, `type`, `date`, plus per-type fields |
| `userSettings` | Per-user goals, units, theme, **role** (`client` \| `coach`) | `userId`, `role` |
| `coachClients` | Coach ↔ client relationships, incl. pending invites | `coachId`, `clientId`, `inviteEmail`, `status` |
| `comments` | Coach feedback on a client's entry or photo | `authorId`, `targetUserId`, `entryId`/`photoId` |
| `photos` | Progress photos (binary lives in Convex file storage) | `userId`, `storageId`, `date` |
| `messages` | Coach ⇄ client chat | `conversationId`, `senderId`, `text`/`storageId` |
| `programs` | Coach-authored workout programs | `coachId`, `name`, `exercises` (JSON) |
| `programAssignments` | Which client has which program | `programId`, `clientId`, `coachId` |
| `notifications` | Unread badges for entries/messages/comments | `recipientId`, `senderId`, `type`, `readAt` |
| `authTables` (built-in) | Users, sessions, auth accounts — from `@convex-dev/auth` | — |

### Navbar

| Piece | File | Notes |
|---|---|---|
| Bottom tab bar | [src/components/pro/ProNavigation.jsx](src/components/pro/ProNavigation.jsx) | Tabs differ by role — Coach: Home, Clients, Programs, Insights, Tools, Settings. Client: Home, Insights, Tools, Photos, Settings |
| Status widget (in shared top bar) | [src/components/pro/ProNavStatus.jsx](src/components/pro/ProNavStatus.jsx) | Rendered inside [TopNavigation.astro](src/layouts/components/common/TopNavigation.astro); shows "Upgrade" or signed-in state — the bridge from Original into Pro |
| Home-screen entry button | [src/components/pro/ProDashboardButton.jsx](src/components/pro/ProDashboardButton.jsx) | Rendered on Original's Home ([index.astro](src/pages/index.astro)); only shows once signed into a Pro account |

Role lookups (`coach` vs `client`) across `ProApp.jsx`, `ProNavStatus.jsx`, `ProDashboardButton.jsx`, and `ProSettings.jsx` all go through one shared [useProRole.js](src/components/pro/useProRole.js) hook (`useProRole()`/`useIsCoach()`) instead of each re-implementing the same localStorage-cache-plus-Convex-query pattern.

### Pages

Pro is a single-page app — one real route, with in-app tabs swapped by [ProApp.jsx](src/components/pro/ProApp.jsx) (see the `renderTab()` switch).

| Route / Tab | File | What it's for |
|---|---|---|
| `/pro/` (route) | [src/pages/pro/index.astro](src/pages/pro/index.astro) | Mounts the whole Pro app |
| — App shell | [src/components/pro/ProApp.jsx](src/components/pro/ProApp.jsx) | Auth check, role resolution, tab routing |
| Sign In | [src/components/pro/SignInPage.jsx](src/components/pro/SignInPage.jsx) | Shown when not authenticated |
| Home tab | [src/components/pro/ProHome.jsx](src/components/pro/ProHome.jsx) | Today's dashboard; opens Day Entry modal |
| Clients tab *(coach only)* | [src/components/pro/ProClients.jsx](src/components/pro/ProClients.jsx) | List/invite/manage clients |
| Client Detail | [src/components/pro/ProClientDetail.jsx](src/components/pro/ProClientDetail.jsx) | One client's full history, comments, thread |
| Programs tab *(coach only)* | [src/components/pro/ProPrograms.jsx](src/components/pro/ProPrograms.jsx) | Build & assign workout programs |
| Insights tab | [src/components/pro/ProInsights.jsx](src/components/pro/ProInsights.jsx) | Trends & charts |
| Tools tab | [src/components/pro/ProTools.jsx](src/components/pro/ProTools.jsx) | Calculators, exercise picker |
| Photos tab *(client only)* | [src/components/pro/ProPhotos.jsx](src/components/pro/ProPhotos.jsx) | Upload/view progress photos |
| Messages | [src/components/pro/ProMessages.jsx](src/components/pro/ProMessages.jsx) | Full inbox (not a tab — opened via the message toast/bell) |
| Settings tab | [src/components/pro/ProSettings.jsx](src/components/pro/ProSettings.jsx) | Account, goals, units |
| Help | [src/components/pro/ProHelp.jsx](src/components/pro/ProHelp.jsx) | Opened from within Settings |

### Modals

`ProDayModal.jsx` used to be one 1,302-line file; it's now a ~370-line shell that renders pieces from [src/components/pro/dayModal/](src/components/pro/dayModal/):

| Modal | File | Opens from | What it's for |
|---|---|---|---|
| Day Entry modal (shell) | [src/components/pro/ProDayModal.jsx](src/components/pro/ProDayModal.jsx) | Home tab | Orchestrates add-entry vs. view-entries mode; Convex mutations for save/delete |
| Meal form | [dayModal/MealForm.jsx](src/components/pro/dayModal/MealForm.jsx) | Day Entry modal | Add a meal |
| Sleep form | [dayModal/SleepForm.jsx](src/components/pro/dayModal/SleepForm.jsx) | Day Entry modal | Add a sleep entry |
| Measurements form | [dayModal/MeasurementsForm.jsx](src/components/pro/dayModal/MeasurementsForm.jsx) | Day Entry modal | Add a measurements entry |
| Exercise log form | [dayModal/ExerciseLogForm.jsx](src/components/pro/dayModal/ExerciseLogForm.jsx) | Day Entry modal | Add exercises, incl. loading a coach-assigned program |
| Photo attach | [dayModal/PhotoAttach.jsx](src/components/pro/dayModal/PhotoAttach.jsx) | Day Entry modal | Attach a photo to the day |
| Entry card (View Entries) | [dayModal/EntryCard.jsx](src/components/pro/dayModal/EntryCard.jsx) | Day Entry modal, view mode | Displays a logged entry + coach feedback |
| Exercise Picker modal | [src/components/pro/ExercisePickerModal.jsx](src/components/pro/ExercisePickerModal.jsx) | Programs tab, Exercise log form | Pick an exercise to add (hardcoded list) |
| Message toast | [src/components/pro/ProMessageToast.jsx](src/components/pro/ProMessageToast.jsx) | Any tab | Pop-up when a new message arrives; tap to open Messages |
| Create/edit program modal (inline) | [src/components/pro/ProPrograms.jsx](src/components/pro/ProPrograms.jsx) | Programs tab | Build or edit a program |
| Photo lightbox / upload modal (inline) | [src/components/pro/ProPhotos.jsx](src/components/pro/ProPhotos.jsx) | Photos tab | Full-size photo view + upload form |

### APIs

Backend = Convex functions (query = read, mutation = write, action = external side-effect like sending email). Each file below is one API module.

**[convex/entries.ts](convex/entries.ts)** — logged meals/weight/sleep/measurements
| Function | Type | Purpose |
|---|---|---|
| `list` | query | Entries for one date |
| `listAll` | query | All entries for the current user |
| `listByDateRange` | query | Entries between two dates |
| `add` | mutation | Create an entry |
| `update` | mutation | Edit an entry |
| `remove` | mutation | Delete an entry |

**[convex/coaches.ts](convex/coaches.ts)** — coach ↔ client relationships & invites (role/invite lifecycle only — client-data reads live in `coachClientData.ts` below, split out since they're a different concern)
| Function | Type | Purpose |
|---|---|---|
| `getRole` | query | Current user's role (`coach`/`client`) |
| `getClients` | query | A coach's linked clients |
| `linkClient` | mutation | Invite/link a client by email |
| `unlinkClient` | mutation | Remove a client relationship |
| `cancelInvite` | mutation | Coach cancels an invite they sent |
| `getPendingInvites` | query | Invites a coach sent, awaiting acceptance |
| `acceptInvite` | mutation | Client accepts a coach's invite |
| `getSentInvites` | query | Invites awaiting the current client's response |
| `claimPendingInvites` | mutation | Attach pre-signup invites to a newly created account |
| `declineInvite` | mutation | Client declines an invite |
| `getMyCoaches` | query | Coaches linked to the current client |

**[convex/coachClientData.ts](convex/coachClientData.ts)** — coach reading a linked client's data
| Function | Type | Purpose |
|---|---|---|
| `getClientEntries` | query | Coach viewing one client's entries (date-range scoped via the `by_user_date` index) |
| `getClientPhotos` | query | Coach viewing one client's photos |

**[convex/messages.ts](convex/messages.ts)** — coach ⇄ client chat
| Function | Type | Purpose |
|---|---|---|
| `list` | query | Messages in one conversation |
| `listConversations` | query | All of the user's conversations |
| `send` | mutation | Send a message |
| `generateUploadUrl` | mutation | Get an upload URL for a file attachment |
| `remove` | mutation | Delete a message |

**[convex/photos.ts](convex/photos.ts)** — progress photos
| Function | Type | Purpose |
|---|---|---|
| `generateUploadUrl` | mutation | Get an upload URL for a photo |
| `save` | mutation | Save photo metadata after upload |
| `list` | query | List a user's photos |
| `remove` | mutation | Delete a photo |

**[convex/programs.ts](convex/programs.ts)** — workout programs
| Function | Type | Purpose |
|---|---|---|
| `list` | query | A coach's authored programs |
| `getMyPrograms` | query | Programs assigned to the current client |
| `create` | mutation | Create a program |
| `update` | mutation | Edit a program |
| `remove` | mutation | Delete a program |
| `assign` | mutation | Assign a program to a client — verifies the client is actually the coach's (accepted relationship required) |
| `unassign` | mutation | Remove an assignment |

**[convex/comments.ts](convex/comments.ts)** — coach feedback (both list functions capped at the 300 most recent, mirroring `messages.ts`)
| Function | Type | Purpose |
|---|---|---|
| `listForClient` | query | Comments on a specific client — caller must be that client or their accepted coach |
| `listMyCoachComments` | query | Comments a client's coach has left them |
| `add` | mutation | Post a comment |
| `remove` | mutation | Delete a comment |

**[convex/notifications.ts](convex/notifications.ts)** — unread badges
| Function | Type | Purpose |
|---|---|---|
| `getUnreadCounts` | query | Unread counts by client/type, for nav badges |
| `markReadForClient` | mutation | Mark one client's items read |
| `markReadByType` | mutation | Mark a notification type read |

**[convex/userSettings.ts](convex/userSettings.ts)** — preferences
| Function | Type | Purpose |
|---|---|---|
| `get` | query | Current user's settings |
| `set` | mutation | Update settings |

**[convex/users.ts](convex/users.ts)** — account
| Function | Type | Purpose |
|---|---|---|
| `viewer` | query | Currently signed-in user |
| `updateName` | mutation | Change display name |

**[convex/emails.ts](convex/emails.ts)**
| Function | Type | Purpose |
|---|---|---|
| `sendCoachInvite` | internalAction | Sends the invite email to a prospective client — internal-only (fixed from a public `action`, which let anyone trigger it directly) |

**[convex/auth.ts](convex/auth.ts)** — authentication (email + password via `@convex-dev/auth`)
Exports `auth`, `signIn`, `signOut`, `store`, `isAuthenticated` — consumed by `ConvexAuthProvider` in [ProApp.jsx](src/components/pro/ProApp.jsx), not called directly from pages.

**[convex/http.ts](convex/http.ts)**
Wires up Convex Auth's built-in HTTP routes (sign-in/out/callback). No custom HTTP endpoints defined.
