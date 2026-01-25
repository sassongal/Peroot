# 🎨 Unified Code Style Protocol

All coding must follow these strict rules to ensure consistent quality across all agents:

## 🏛️ Architecture (Strict)

- **Pattern:** Feature-First, Clean Architecture.
- **State Management:** Riverpod (`AsyncNotifier` preferred).
- **Routing:** `go_router` with Typed Routes.
- **Models:** Inherently immutable using `Freezed` & `JsonSerializable`.

## 💻 Language & Documentation

- **Variables/Logic:** English only.
- **Comments/Commit Messages:** Hebrew (unless requested otherwise).
- **Hardcoded Strings:** Forbidden. Use L10n (`app_en.arb`, `app_he.arb`).

## 🧱 Design System

- Use `Theme.of(context).colorScheme`.
- Follow the `PremiumTheme` guidelines.
- Responsive design for all screen sizes.

## 🛡️ Stability

- **Type Safety:** No `dynamic`.
- **Null Safety:** Explicit handling.
- **Logic:** Data layer handles exceptions, Presentation shows failures.

## 🏃 Workflow

1. Define Domain (Freezed).
2. Implement Repository (Data).
3. Build Controller (Riverpod).
4. Create Screen (Presentation).
5. Run `build_runner`.
