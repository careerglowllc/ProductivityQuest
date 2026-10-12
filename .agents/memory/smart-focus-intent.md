---
name: Smart Focus learning intent
description: Product constraints for private AI task prioritization and implicit learning.
---
The user wants written per-quest feedback to personalize Smart Focus separately for each account, plus learning from repeated deliberate removals without overinterpreting behavior.

**Why:** The user specifically worried about false positives and wants due/start-today work, high importance, and actionable deadline/general tasks prioritized.

**How to apply:** Keep the shared model separate from private account memory. Do not introduce cross-account learning, treat ignored or completed tasks as dislikes, or let inferred preferences silently suppress urgent deadlines. Inference should be inspectable and reversible; zero false positives is not a guarantee we can make. Prefer stored contextual preferences over separate model training until there is evidence that fine-tuning is needed.
