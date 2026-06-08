must strictly follow the branch naming and commit message conventions. I have noticed that the structure is NOT being followed consistently.

Branch Naming Convention
Feature Development

feat(workvibe-taskid)-feature-name
Bug Fixes

fix(workvibe-taskid)-bug-detail
Production Hotfixes

hotfix(workvibe-taskid)-bug-detail


Commit Message Convention
Feature Commits

feat : feature detail
Bug Fix Commits

fix : bug fixes detail
Production Hotfix Commits

hotfix : bug fixes detail


Important

Whenever a production build is shared with the client, a proper Git Tag must be created for that release.
A single PR should ideally contain a maximum of 20 file changes.Large PRs make code review difficult


Please ensure this is followed consistently across all projects.