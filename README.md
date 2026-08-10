# Recurrly

A full-stack subscription management mobile application designed to help users track, manage, and stay on top of their recurring expenses from one centralized dashboard.

> **Acknowledgements**
>
> This project was inspired by and built while learning from the excellent React Native development content created by **JavaScript Mastery**. Their tutorial and resources were incredibly helpful in understanding the architecture, technologies, and development workflow used in this project.
>
> I have adapted and extended the project as part of my own learning and development journey. Huge thanks to the JavaScript Mastery team for making high-quality educational content available to the community.

## ✨ Features

- **Subscription Dashboard** — View and manage recurring expenses from a centralized dashboard.
- **Active & Inactive Tracking** — Keep track of active subscriptions and identify services that are no longer being used.
- **Secure Authentication** — User authentication and account management powered by Clerk.
- **Native Navigation** — Smooth navigation designed for both Android and iOS.
- **On-Device Data Persistence** — Subscriptions are stored locally per-account in a SQLite database (`expo-sqlite`), scoped by Clerk user id.
- **Product Analytics** — User behavior and application analytics powered by PostHog.
- **Reusable Architecture** — Organized components and services designed with maintainability and reusability in mind.

**Roadmap** — not yet implemented: scheduled email renewal reminders, a Supabase/Prisma backend to replace on-device SQLite, and monetization/billing.

## ⚙️ Tech Stack

### Frontend & Mobile

- **[React Native](https://reactnative.dev/)** — Framework for building native mobile applications using React.
- **[Expo](https://expo.dev/)** — Development framework and tooling for React Native applications.
- **[TypeScript](https://www.typescriptlang.org/)** — Provides static typing and improved maintainability across the project.
- **[NativeWind](https://www.nativewind.dev/)** — Tailwind CSS-based styling for React Native.

### Data & Persistence

- **[expo-sqlite](https://docs.expo.dev/versions/v54.0.0/sdk/sqlite/)** (`~16.0.10`) — On-device SQLite database storing subscriptions per Clerk user id. No backend server exists yet; the schema is written to migrate cleanly to Supabase/Prisma later.

### Infrastructure & Tools

- **Clerk** — Authentication and user management.
- **PostHog** — Product analytics and user behavior tracking.
- **CodeRabbit** — AI-assisted code review and development feedback.

## 🚀 Getting Started

### Prerequisites

Make sure you have the following installed:

- [Git](https://git-scm.com/)
- [Node.js](https://nodejs.org/)
- [npm](https://www.npmjs.com/)

### Clone the Repository

```bash
git clone https://github.com/Sp00fyBoi/react-native-recurrly.git
cd react-native-recurrly
```

### Install Dependencies

```bash
npm install
```

### Start the Development Server

```bash
npx expo start
```

Once Expo starts, you'll see a QR code and several available commands:

- `a` — Open on Android
- `i` — Open on iOS Simulator
- `w` — Open on web
- `r` — Reload the application
- `m` — Open the development menu

For the easiest development experience, install **Expo Go** on your Android or iOS device and scan the QR code displayed in your terminal.

> **Note:** Your phone and development machine generally need to be connected to the same network for Expo Go to connect to the development server. VPNs or network restrictions may interfere with the connection.

## 🔐 Environment Variables

Create a `.env` file in the root of the project:

```env
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=
EXPO_PUBLIC_POSTHOG_PROJECT_TOKEN=
EXPO_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

Add your own credentials to the appropriate variables. The `EXPO_PUBLIC_`
prefix is required — the app reads these through `process.env`, and Expo only
inlines variables carrying that prefix into the bundle.

## 📱 Running the Application

After configuring the environment variables:

```bash
npx expo start
```

Then launch the application through Expo Go or an Android/iOS development environment.

## 🚢 Deployment

Builds run on [EAS](https://expo.dev/eas). `android/` and `ios/` are generated
from `app.json` at build time, so never edit them by hand — EAS regenerates them.

**One-time setup**

```bash
npm install -g eas-cli
eas login
eas init            # links the project and writes extra.eas.projectId
```

Because `.env` is git-ignored and never uploaded, the `EXPO_PUBLIC_*` variables
must also exist on EAS or the built app will boot straight into the
"Configuration required" screen:

```bash
eas env:create --environment production --name EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY --value pk_live_...
eas env:create --environment production --name EXPO_PUBLIC_POSTHOG_PROJECT_TOKEN --value phc_...
eas env:create --environment production --name EXPO_PUBLIC_POSTHOG_HOST --value https://us.i.posthog.com
```

Repeat with `--environment preview` for internal builds. Each build profile in
`eas.json` declares which environment it pulls from.

**Building and submitting**

```bash
eas build --profile preview --platform android     # installable APK for testers
eas build --profile production --platform all      # AAB + IPA for the stores
eas submit --profile production --platform android # or --platform ios
```

Version numbers are managed remotely (`appVersionSource: "remote"`), so
`versionCode` and `buildNumber` auto-increment on every production build. Bump
the user-facing `version` in `app.json` by hand for each release.

## 📚 Learning & Inspiration

This project was created as a practical learning experience while following **JavaScript Mastery's React Native content**.

The original educational material provided a strong foundation for learning:

- React Native and Expo
- File-based navigation
- NativeWind
- Authentication
- Backend API architecture
- MongoDB integration
- Analytics
- Full-stack mobile application development

Rather than being a direct production application, this project represents my implementation and experimentation while learning these technologies.

A special thanks to **[JavaScript Mastery](https://www.youtube.com/@javascriptmastery/videos)** for the tutorials and educational resources that helped make this project possible.

## 📝 Disclaimer

This project is an educational implementation created for learning purposes. It is not affiliated with or officially associated with JavaScript Mastery.

## 🔗 Credits & Resources

The original learning material and resources can be found through the JavaScript Mastery community and their educational content.

- [JavaScript Mastery — YouTube](https://www.youtube.com/@javascriptmastery/videos)
- [JavaScript Mastery](https://www.jsmastery.pro/)

---

Made while learning, experimenting, and building with React Native 🚀
