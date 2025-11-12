# Dependabot Dependency Management Plan

## Overview

This plan outlines the use of GitHub’s built-in Dependabot for automated dependency management in this project. The primary goal is to keep dependencies up to date with minimal configuration and maintenance overhead.

## Approach

- **Tool:** GitHub Dependabot (native integration)
- **Priority:** Simplicity and minimal configuration
- **Setup:**
  - Enable Dependabot in GitHub repository settings (Security & analysis)
  - Optionally add a minimal `.github/dependabot.yml` file for custom scheduling or multiple ecosystems

## Basic Configuration Example

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
```

- For pnpm, use `package-ecosystem: "npm"` (Dependabot supports pnpm lockfiles)
- Add additional entries for other package managers or subdirectories as needed

## Customization Options

- **Update frequency:** `daily`, `weekly`, or `monthly`
- **Open PR limit:**
  ```yaml
  open-pull-requests-limit: 5
  ```
- **Multiple ecosystems:** Add more `updates` entries for e.g. GitHub Actions
- **Security updates only:** Enable in GitHub settings, omit config file if desired

## Best Practices

- Review Dependabot PRs promptly to avoid merge conflicts
- Enable auto-merge for trusted dependencies if desired
- Monitor Dependabot alerts for security vulnerabilities

## Next Steps

1. Enable Dependabot in GitHub repository settings
2. Add `.github/dependabot.yml` (optional, for custom schedule or multiple ecosystems)
3. Monitor and review PRs for dependency updates

