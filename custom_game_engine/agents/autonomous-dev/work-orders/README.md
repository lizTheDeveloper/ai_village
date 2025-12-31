# Work Orders System

Work orders are the primary communication mechanism between users, agents, and future implementers. They provide structured task definitions with clear acceptance criteria and success metrics.

## 📂 Structure

```
work-orders/
├── TEMPLATE.md                    # Template for new work orders
├── [task-name]/
│   ├── work-order.md             # Main work order
│   └── spec.md                   # Detailed specification (optional)
```

## 💬 User Notes Section

**Every work order has a "User Notes" section at the top.** This is where you (the user) can leave context for future agents about:

- **Difficulty assessment** - Is this harder or easier than it looks?
- **Tips** - What shortcuts or best practices should agents know?
- **Warnings** - What gotchas or pitfalls exist?
- **Questions** - What ambiguities need clarification?

### When to Add User Notes

Add or update User Notes:
1. **Before starting a work order** - Share your initial assessment of difficulty
2. **During implementation** - Add tips as you discover shortcuts
3. **After hitting a blocker** - Document what went wrong and how to avoid it
4. **When you learn something unexpected** - "This was way easier than I thought because X"

### Example User Notes

```markdown
## 💬 User Notes

### Difficulty Assessment
- **Overall Complexity:** Medium
- **Hardest Part:** Refactoring existing system without breaking tests
- **Easier Than It Looks:** The component already exists, just needs new fields

### User Tips
- 💡 **Start with unit tests** - Write tests first, implementation follows naturally
- 💡 **Check existing similar code** - Look at XYZ system for reference pattern
- ⚠️ **Don't modify the registry directly** - Use the helper functions instead
- 🎯 **Test incrementally** - Run `npm run build` after each file change

### Common Pitfalls
- ❌ **Don't use console.log** - Use the Agent Dashboard instead
- ❌ **Don't add fallback values** - Crash loudly if data is missing
- ✅ **DO read CLAUDE.md first** - Follow the project conventions

### Questions to Ask User
- Should this feature work with existing saves or only new games?
- What happens if an agent has this skill at level 0?
```

## 🤖 For Agents: How to Use Work Orders

### Before Starting Work

1. **Read the User Notes section FIRST** - It contains critical context
2. **Check for questions** - Answer any questions in the "Questions to Ask User" section
3. **Assess blockers** - Verify all upstream dependencies are complete
4. **Read the full spec** - Understand the entire requirement before writing code

### During Implementation

1. **Add questions as you go** - If you discover ambiguities, add them to the "Questions to Ask User" section
2. **Update status** - Change status from `IN_PROGRESS` to `READY_FOR_TESTS` when done
3. **Document your findings** - If you discover new pitfalls, add them to User Notes for the next agent

### After Completing Work

1. **Verify all acceptance criteria** - Check each criterion is met
2. **Run tests** - Ensure `npm run build` and all tests pass
3. **Update the work order** - Mark completed criteria with ✅
4. **Leave notes for reviewers** - Add any important context to User Notes

## 📝 Creating New Work Orders

Use the `TEMPLATE.md` file as a starting point:

```bash
# Create new work order directory
mkdir -p work-orders/my-new-feature

# Copy template
cp work-orders/TEMPLATE.md work-orders/my-new-feature/work-order.md

# Edit the work order
# Fill in all sections, especially User Notes!
```

## 🎯 Best Practices

### For Users

- **Be specific in User Notes** - "The X function is slow" is better than "Performance issues"
- **Update notes as you learn** - Add tips when you discover shortcuts
- **Mark uncertainty** - Use "❓" for things you're unsure about
- **Link to examples** - Point to existing code that follows the right pattern

### For Agents

- **Trust the User Notes** - If the user says "easier than it looks," believe them
- **Ask when stuck** - Add questions to the work order rather than guessing
- **Document discoveries** - If you find a better approach, add it to User Notes
- **Keep it updated** - Work orders are living documents, not write-once specs

## 📊 Work Order Status Levels

| Status | Meaning | Who Uses It |
|--------|---------|-------------|
| `IN_PROGRESS` | Currently being worked on | Agent working on it |
| `READY_FOR_TESTS` | Implementation complete, needs testing | Implementation agent → Test agent |
| `COMPLETE` | All criteria met, tests passing | Test agent → Archive |
| `BLOCKED` | Waiting on dependencies | Any agent |

## 🔗 Related Documents

- [MASTER_ROADMAP.md](../../../../MASTER_ROADMAP.md) - High-level phase tracking
- [CLAUDE.md](../../../../CLAUDE.md) - Development guidelines and conventions
- [openspec/AGENTS.md](../../../../openspec/AGENTS.md) - OpenSpec workflow for agents

---

**Remember:** Work orders are how we communicate across time and agents. The better the notes, the smoother the implementation!
