# Issue Tracker

Issues for this project are tracked in **GitHub Issues**.

- Repository: `sassongal/Peroot`
- CLI tool: `gh` (GitHub CLI)

## Creating issues

```bash
gh issue create --title "Title" --body "Body" --label "needs-triage"
```

## Listing issues

```bash
gh issue list
gh issue list --label "ready-for-agent"
```

## Updating issues

```bash
gh issue edit <number> --add-label "ready-for-human" --remove-label "needs-triage"
gh issue close <number>
gh issue comment <number> --body "Comment text"
```

## Viewing an issue

```bash
gh issue view <number>
```
