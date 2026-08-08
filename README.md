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
- **Scheduled Email Reminders** — Receive reminders before upcoming subscription renewals.
- **Secure Authentication** — User authentication and account management powered by Clerk.
- **Native Navigation** — Smooth navigation designed for both Android and iOS.
- **Full-Stack Data Persistence** — Subscription and user data stored through a Node.js/Express backend with MongoDB.
- **Monetization Ready** — Architecture prepared for billing and payment functionality.
- **Product Analytics** — User behavior and application analytics powered by PostHog.
- **Reusable Architecture** — Organized components and services designed with maintainability and reusability in mind.

## ⚙️ Tech Stack

### Frontend & Mobile

- **[React Native](https://reactnative.dev/)** — Framework for building native mobile applications using React.
- **[Expo](https://expo.dev/)** — Development framework and tooling for React Native applications.
- **[TypeScript](https://www.typescriptlang.org/)** — Provides static typing and improved maintainability across the project.
- **[NativeWind](https://www.nativewind.dev/)** — Tailwind CSS-based styling for React Native.

### Backend & Database

- **[Node.js](https://nodejs.org/)** — JavaScript runtime used for the backend service.
- **[Express](https://expressjs.com/)** — Backend framework for API routing and middleware.
- **[MongoDB](https://www.mongodb.com/)** — NoSQL database used for storing users and subscription data.

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
POSTHOG_PROJECT_TOKEN=
POSTHOG_HOST=https://us.i.posthog.com
```

Add your own credentials to the appropriate variables.

## 📱 Running the Application

After configuring the environment variables:

```bash
npx expo start
```

Then launch the application through Expo Go or an Android/iOS development environment.

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
