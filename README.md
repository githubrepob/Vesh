# VESH — Ambient AI Companion & Personal Productivity Environment

<p align="center">
  <strong>A living digital environment designed to think, assist, organize, and stay with you.</strong>
</p>

<p align="center">
  <em>Not just another chatbot. A persistent AI companion and personal workspace.</em>
</p>

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [The Vision Behind VESH](#2-the-vision-behind-vesh)
3. [What Makes VESH Different?](#3-what-makes-vesh-different)
4. [VESH V1.0 — Product Overview](#4-vesh-v10--product-overview)
5. [Features](#5-features)
6. [How to Use VESH](#6-how-to-use-vesh)
7. [Voice Interaction](#7-voice-interaction)
8. [AI, Memory & Personalization](#8-ai-memory--personalization)
9. [Productivity Workspace](#9-productivity-workspace)
10. [Architecture](#10-architecture)
11. [Technology Stack](#11-technology-stack)
12. [Project Structure](#12-project-structure)
13. [Getting Started](#13-getting-started)
14. [Environment Configuration](#14-environment-configuration)
15. [Supabase Setup & Database](#15-supabase-setup--database)
16. [Authentication & Security](#16-authentication--security)
17. [Running VESH Locally](#17-running-vesh-locally)
18. [Testing & Quality Assurance](#18-testing--quality-assurance)
19. [Production Deployment](#19-production-deployment)
20. [Current Limitations & Considerations](#20-current-limitations--considerations)
21. [V1.0 Release Scope](#21-v10-release-scope)
22. [V1.1 — Refinement & Intelligence](#22-v11--refinement--intelligence)
23. [V2.0 — The Next Evolution](#23-v20--the-next-evolution)
24. [Long-Term Vision](#24-long-term-vision)
25. [Development Principles](#25-development-principles)
26. [Contributing](#26-contributing)
27. [License](#27-license)

---

# 1. Introduction

**VESH** is an ambient AI companion and personal productivity environment built to provide a more natural, continuous, and contextual way of interacting with artificial intelligence.

Traditional AI assistants are primarily conversation interfaces. You open an application, ask a question, receive an answer, and leave.

VESH takes a different approach.

It combines an interactive ambient environment, conversational AI, voice interaction, persistent memory, and productivity tools into one unified experience.

VESH is designed to feel less like opening a chatbot and more like entering a personal digital space where an intelligent companion is already present.

Users can interact through text or voice, manage everyday activities, organize information, maintain personal consistency, and work with an AI that can use stored context to make interactions more meaningful.

### Core idea

> A personal AI environment that doesn't just answer questions — it helps you think, remember, organize, and move forward.

**Project:** VESH  
**Release:** V1.0  
**Category:** Ambient AI Companion / Personal Productivity Environment  
**Frontend:** Next.js + TypeScript  
**Backend:** Next.js API routes + Supabase  
**Database:** PostgreSQL through Supabase  
**AI:** OpenAI-compatible chat-completions provider  
**Speech:** Azure Speech + Groq-compatible Whisper transcription  
**Live Search:** Tavily integration

---

# 2. The Vision Behind VESH

The long-term vision is to create an AI environment that feels like a persistent part of a user's digital life.

Instead of treating AI as a tool that exists only when prompted, VESH aims to provide a continuous environment where the user can:

- Talk naturally with an AI companion.
- Switch between voice and text.
- Maintain ongoing conversations.
- Store and retrieve useful information.
- Organize personal work and activities.
- Track consistency and daily progress.
- Use ambient visual environments.
- Access everyday utilities without leaving the experience.

The experience is built around three foundational ideas.

### 2.1 Presence

VESH should feel present rather than like a static chat window.

An animated companion, ambient scenes, clocks, and environmental elements create a living interface.

### 2.2 Continuity

Conversations and useful information should not feel disconnected.

Persistent storage and memory capabilities provide a foundation for continuity across sessions.

### 2.3 Utility

An AI companion should be useful beyond conversation.

VESH brings together conversational assistance and practical productivity functionality in a unified environment.

---

# 3. What Makes VESH Different?

| Traditional chatbot | VESH |
|---|---|
| Primarily conversation-focused | Companion-oriented environment |
| Static chat interface | Ambient interactive experience |
| Mostly session-based interaction | Persistent user data and memory |
| Text-first experience | Text and voice interaction |
| Separate productivity tools | Integrated productivity workspace |
| Limited environmental presence | Animated companion and ambient scenes |
| Answers individual prompts | Designed for ongoing interaction |

VESH is not intended to replace every specialized application. Its goal is to reduce the fragmentation between conversation, personal organization, and everyday assistance.

---

# 4. VESH V1.0 — Product Overview

V1.0 establishes the foundation of the VESH ecosystem.

The first release focuses on delivering a functional and integrated experience rather than attempting to implement every part of the long-term vision.

### V1.0 priorities

- A polished ambient companion interface.
- Conversational AI with text interaction.
- Voice input and speech output.
- Authenticated user accounts.
- Persistent conversations and user data.
- Memory and contextual assistance.
- Integrated productivity workspace.
- Everyday time utilities.
- Daily consistency tracking.
- Optional live web search.
- Database-backed storage and access control.

V1.0 is the foundation upon which subsequent versions can improve intelligence, interaction quality, reliability, and personalization.

---

# 5. Features

## 5.1 Ambient Companion Environment

VESH provides an interactive environment centered around its digital companion.

Features include:

- Animated companion presence.
- Ambient visual environment.
- Selectable environmental scenes.
- Clock and time-oriented interface elements.
- A unified interaction area.
- A responsive interface for different screen sizes.

The ambient environment is an important part of VESH's identity. It is not simply decorative UI; it establishes the feeling of interacting with a persistent digital companion.

## 5.2 Ambient Scenes

VESH supports selectable ambient environments.

The initial visual direction includes scenes such as:

- Rainy night.
- Night sky.
- Fireplace.
- Other atmospheric environments.

Scenes provide a way to change the environment without changing the underlying assistant functionality.

## 5.3 Conversational AI

Users can communicate with VESH through natural-language conversations.

Core capabilities include:

- Text-based conversations.
- Multi-turn interaction.
- Contextual responses.
- AI-powered assistance.
- Persistent conversation history.
- Conversation continuity through stored data.

The AI provider is configurable through environment variables, allowing an OpenAI-compatible chat-completions endpoint to power the assistant.

## 5.4 Voice Interaction

VESH supports voice input and speech output.

The intended interaction model combines deliberate activation with continuous conversation during an active interaction session.

Voice capabilities include:

- Speech-to-text transcription.
- AI-generated responses.
- Text-to-speech playback.
- Hindi and English voice configuration.
- Conversation continuation.
- Interruption-aware interaction.
- Playback controls and text fallback behavior.

See [Voice Interaction](#7-voice-interaction) for provider configuration and implementation details.

## 5.5 Persistent Memory

VESH provides database-backed storage for information that can support future interactions.

Memory is intended to help the assistant maintain useful context rather than treating every conversation as completely independent.

The system provides a foundation for:

- Persisting relevant information.
- Retrieving stored context.
- Associating information with the authenticated user.
- Supporting more contextual conversations.

Memory should be treated as a user-controlled productivity and assistance feature. It should not be assumed that every conversation detail is automatically a permanent memory.

## 5.6 Productivity Workspace

VESH includes an integrated workspace for organizing everyday activities.

The workspace brings together personal information and productivity-related functionality, including:

- Notes.
- Tasks.
- Calendar events.
- Entities and projects.
- Personal organization.
- Daily consistency and attendance tracking.

The purpose is to keep useful information close to the assistant instead of requiring users to move between separate applications for every task.

## 5.7 Time Utilities

VESH includes time-oriented utilities such as:

- Clock.
- Timer.
- Stopwatch.
- World clock.

These features support everyday time management within the ambient environment.

## 5.8 Daily Consistency Tracking

VESH includes functionality for tracking daily check-ins and personal consistency.

This provides a foundation for building habits and maintaining awareness of daily progress.

## 5.9 Public Streak Sharing

VESH supports optional public streak sharing.

Users can create a shareable public page containing a limited streak snapshot and total check-in count.

Important privacy characteristics:

- Sharing is opt-in.
- Public pages use unguessable share tokens.
- Owners can revoke sharing.
- The public page does not expose account identity, tasks, notes, or conversations.

## 5.10 Live Web Search

VESH can use an optional Tavily integration for live web search.

This allows the assistant to retrieve current information when the integration is configured.

Live search is separate from the language model's internal knowledge. If the search integration is unavailable, VESH should not represent potentially outdated model knowledge as verified live information.

---

# 6. How to Use VESH

The following guide describes the intended user journey through V1.0.

## 6.1 Create an Account

1. Open the deployed VESH application.
2. Navigate to the login or sign-up screen.
3. Create an account using the available authentication flow.
4. Sign in to access your personal environment.

Your account provides access to user-specific conversations and productivity data.

## 6.2 Enter the Ambient Environment

After authentication, open the main VESH environment.

The home experience provides access to the companion, conversation interface, and ambient features.

## 6.3 Start a Conversation

You can interact with VESH using text.

Examples:

- Ask a question.
- Request an explanation.
- Discuss an idea.
- Ask for help with a task.
- Continue an existing conversation.

VESH uses the configured AI provider to generate responses.

## 6.4 Use Voice Interaction

Where the configured speech services are available:

1. Activate voice interaction using the available voice controls.
2. Speak your request.
3. Allow the transcription service to process the audio.
4. VESH generates a response.
5. Listen to the spoken response.
6. Continue the conversation or end the interaction.

You can also use text interaction when voice services are unavailable.

## 6.5 Change the Ambient Scene

Use the available scene controls to switch between supported environments.

The ambient scene changes the visual atmosphere while retaining the core companion experience.

## 6.6 Use Time Utilities

Access the available clock, timer, stopwatch, and world clock functionality through the ambient interface.

## 6.7 Organize Your Work

Open the Workspace to access productivity functionality.

Use the available sections to manage:

- Notes.
- Tasks.
- Calendar events.
- Entities and projects.
- Daily consistency records.

The available functionality depends on the corresponding workspace module.

## 6.8 Maintain Daily Consistency

Use the check-in functionality to record daily progress.

Where enabled, you can optionally generate a public streak-sharing link and revoke it later.

## 6.9 Use Live Search

When Tavily is configured and the relevant functionality is available, request information that requires current web research.

Do not treat ordinary model-generated answers as live search results.

---

# 7. Voice Interaction

Voice is an important part of the VESH experience.

The architecture separates speech recognition from speech synthesis.

### 7.1 Speech-to-Text (STT)

VESH uses a configurable transcription provider.

Current provider configuration:

| Role | Provider |
|---|---|
| Primary | Groq-compatible Whisper API |
| Secondary | Azure Speech |
| Preferred provider | Configurable |
| Language | Configurable |

The transcription route supports provider failover: when the preferred provider fails, the secondary provider can be attempted.

Current configuration example:

```env
VESH_STT_PROVIDER=groq
VESH_STT_MODEL=whisper-large-v3-turbo
VESH_STT_LANGUAGE=hi
VESH_STT_TIMEOUT_MS=10000
```

The current Groq-compatible transcription implementation reuses:

```env
VESH_AI_BASE_URL=
VESH_AI_API_KEY=
```

This avoids requiring a separate transcription API credential when the same compatible provider supports both operations.

### 7.2 Text-to-Speech (TTS)

Azure Speech provides hosted speech synthesis.

Example configuration:

```env
AZURE_SPEECH_KEY=
AZURE_SPEECH_REGION=
AZURE_SPEECH_VOICE_HI=hi-IN-SwaraNeural
AZURE_SPEECH_VOICE_EN=en-IN-NeerjaNeural
```

Voice availability and quality should be verified in the target Azure region.

The client also provides browser-based speech fallback where supported by the implementation and browser.

### 7.3 Voice Design Goals

The intended VESH voice experience prioritizes:

- Natural conversational delivery.
- Hindi and English support.
- A consistent companion voice.
- Low response latency.
- Clear speech recognition.
- Graceful handling of provider failures.
- Ability to interrupt playback.
- Concise spoken responses.

### 7.4 Voice Reliability Considerations

Speech services depend on external providers, network connectivity, regional availability, quotas, and account limits.

For production deployments:

- Keep provider credentials server-side.
- Monitor provider failures and rate limits.
- Test Hindi and English independently.
- Verify transcription fallback.
- Verify speech playback and interruption.
- Retain text interaction as a fallback.

---

# 8. AI, Memory & Personalization

## 8.1 AI Provider

VESH uses an OpenAI-compatible chat-completions provider configured through:

```env
VESH_AI_BASE_URL=
VESH_AI_API_KEY=
VESH_AI_MODEL=
```

This design keeps the application decoupled from a single model vendor.

## 8.2 Contextual Conversations

The assistant is designed for multi-turn conversations.

Conversation history and user-specific data provide the foundation for contextual interactions across sessions.

## 8.3 Persistent Data

Supabase stores user-associated application data, including supported conversation and productivity records.

The database provides a persistent foundation for the companion experience.

## 8.4 Future Memory Improvements

Potential refinements include:

- Better memory extraction.
- Memory relevance scoring.
- Duplicate detection.
- Memory expiration and lifecycle management.
- User-facing memory review.
- Context retrieval optimization.
- Better distinction between temporary and long-term information.

These are future improvements, not promises that every capability is already present in V1.0.

---

# 9. Productivity Workspace

The Workspace extends VESH beyond conversational assistance.

Its purpose is to provide a unified place for everyday organization.

### 9.1 Notes

Store useful information, ideas, and reference material.

### 9.2 Tasks

Manage work items and personal activities.

### 9.3 Calendar

Organize events and time-related activities.

### 9.4 Entities and Projects

Maintain structured information about relevant entities and projects.

### 9.5 Attendance and Consistency

Record check-ins and monitor personal consistency.

### 9.6 Future Workspace Direction

Potential improvements include:

- Task prioritization.
- Recurring tasks.
- Calendar synchronization.
- Natural-language task creation.
- AI-generated daily plans.
- Context-aware reminders.
- Better project organization.
- Cross-module search.

---

# 10. Architecture

VESH follows a modular full-stack architecture.

The frontend provides the ambient environment and workspace. Next.js API routes handle server-side operations, while Supabase provides authentication and persistent data storage.

### High-level architecture

```text
                       USER
                        |
                        v
              VESH AMBIENT INTERFACE
                 Next.js + React
                        |
          +-------------+-------------+
          |             |             |
          v             v             v
     Companion       Workspace     Time Utilities
     Environment     Modules       & Scenes
          |             |             |
          +-------------+-------------+
                        |
                        v
                 NEXT.JS API LAYER
                        |
       +----------------+----------------+
       |                |                |
       v                v                v
   AI SERVICES      SPEECH SERVICES   LIVE SEARCH
       |                |                |
       v                v                v
  Chat Provider    Groq / Azure       Tavily
       |
       v
   AI RESPONSE
       |
       v
  VESH INTERACTION
                        |
                        v
                 SUPABASE BACKEND
                        |
             +----------+----------+
             |          |          |
             v          v          v
         Auth       PostgreSQL     RLS
                    Database
```

### 10.1 Frontend Layer

Responsible for:

- User interface.
- Ambient environment.
- Companion presentation.
- Conversation interface.
- Voice interaction controls.
- Workspace modules.
- Client-side state and interaction.

### 10.2 API Layer

Responsible for:

- Authenticated server-side operations.
- AI provider communication.
- Speech transcription.
- Speech synthesis.
- Live search integration.
- Data operations.
- Rate limiting.
- Input validation.

### 10.3 Data Layer

Supabase provides:

- Authentication.
- PostgreSQL database.
- Persistent user data.
- Row Level Security.
- User-scoped access control.

### 10.4 External Integrations

| Integration | Responsibility |
|---|---|
| AI provider | Conversational responses |
| Groq-compatible Whisper | Speech transcription |
| Azure Speech | Speech recognition fallback and synthesis |
| Tavily | Optional live web search |
| Supabase | Authentication and persistent data |

---

# 11. Technology Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 |
| Frontend | React |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Backend | Next.js API Routes |
| Database | PostgreSQL |
| Backend platform | Supabase |
| Authentication | Supabase Auth |
| AI integration | OpenAI-compatible API |
| Speech recognition | Groq-compatible Whisper |
| Speech services | Azure Speech |
| Web search | Tavily |
| Testing | Vitest |
| Package manager | npm |
| Version control | Git |
| Deployment target | Vercel-compatible Next.js hosting |

Exact package versions are maintained in `package.json` and the lockfile.

---

# 12. Project Structure

The following is a conceptual overview of the application structure. Refer to the repository for the exact current file and directory layout.

```text
vesh/
│
├── app/
│   ├── api/
│   │   ├── assistant/
│   │   └── ...
│   ├── login/
│   ├── workspace/
│   ├── ...
│   └── layout.tsx
│
├── features/
│   ├── companion/
│   ├── interactive/
│   ├── ...
│
├── lib/
│   ├── supabase/
│   ├── ...
│
├── public/
│   ├── models/
│   ├── ...
│
├── supabase/
│   └── migrations/
│
├── tests/
│
├── .env.example
├── .gitignore
├── next.config.ts
├── package.json
├── package-lock.json
├── tsconfig.json
└── README.md
```

The application is organized around modular features, server-side integrations, reusable components, and database migrations.

---

# 13. Getting Started

## 13.1 Prerequisites

Install the following:

- Node.js 20.9 or later.
- npm.
- Git.
- A Supabase project.
- An OpenAI-compatible AI provider.
- Optional Azure Speech credentials.
- Optional Tavily API key.

Check the installed versions:

```bash
node -v
npm -v
git --version
```

## 13.2 Clone the Repository

```bash
git clone <YOUR_REPOSITORY_URL>
cd vesh
```

Replace the repository URL with the actual GitHub repository URL.

## 13.3 Install Dependencies

```bash
npm ci
```

`npm ci` installs the dependency versions recorded in `package-lock.json`.

## 13.4 Configure Environment Variables

Create a local environment file:

```bash
copy .env.example .env.local
```

On macOS/Linux:

```bash
cp .env.example .env.local
```

Populate the required configuration values.

See [Environment Configuration](#14-environment-configuration).

## 13.5 Configure Supabase

1. Create a Supabase project.
2. Retrieve the project URL.
3. Retrieve the public anonymous key.
4. Configure the environment variables.
5. Apply every SQL migration in `supabase/migrations/` in ascending filename order.
6. Configure the authentication redirect URLs.

See [Supabase Setup & Database](#15-supabase-setup--database).

## 13.6 Start the Development Server

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

Create an account and access the VESH environment.

---

# 14. Environment Configuration

VESH uses environment variables to configure its backend integrations.

Create `.env.local` in the project root.

## 14.1 Required Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

NEXT_PUBLIC_SITE_URL=http://localhost:3000

VESH_AI_BASE_URL=
VESH_AI_API_KEY=
VESH_AI_MODEL=

VESH_TIME_ZONE=Asia/Kolkata
```

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public anonymous key |
| `NEXT_PUBLIC_SITE_URL` | Application URL used for authentication redirects |
| `VESH_AI_BASE_URL` | AI provider API base URL |
| `VESH_AI_API_KEY` | Server-side AI provider credential |
| `VESH_AI_MODEL` | Configured chat model |
| `VESH_TIME_ZONE` | Timezone for server-side date interpretation |

`NEXT_PUBLIC_SITE_URL` should point to the deployed HTTPS URL in production.

## 14.2 Speech-to-Text Variables

```env
VESH_STT_PROVIDER=groq
VESH_STT_MODEL=whisper-large-v3-turbo
VESH_STT_LANGUAGE=hi
VESH_STT_TIMEOUT_MS=10000
```

The current transcription implementation reuses the configured AI provider base URL and API key for Groq-compatible Whisper requests.

The transcription language can be adjusted according to the intended usage.

## 14.3 Azure Speech Variables

```env
AZURE_SPEECH_KEY=
AZURE_SPEECH_REGION=

AZURE_SPEECH_VOICE_HI=hi-IN-SwaraNeural
AZURE_SPEECH_VOICE_EN=en-IN-NeerjaNeural
```

The Azure key and region must belong to the same Speech resource.

## 14.4 Live Search Variables

```env
TAVILY_API_KEY=
```

This variable is optional.

Without a valid Tavily API key, live search functionality is unavailable.

## 14.5 Complete Example

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# AI
VESH_AI_BASE_URL=
VESH_AI_API_KEY=
VESH_AI_MODEL=

# Timezone
VESH_TIME_ZONE=Asia/Kolkata

# Speech-to-text
VESH_STT_PROVIDER=groq
VESH_STT_MODEL=whisper-large-v3-turbo
VESH_STT_LANGUAGE=hi
VESH_STT_TIMEOUT_MS=10000

# Azure Speech
AZURE_SPEECH_KEY=
AZURE_SPEECH_REGION=
AZURE_SPEECH_VOICE_HI=hi-IN-SwaraNeural
AZURE_SPEECH_VOICE_EN=en-IN-NeerjaNeural

# Live search
TAVILY_API_KEY=
```

**Security requirements:**

- Never commit `.env.local`.
- Never publish provider credentials.
- Never prefix private API keys with `NEXT_PUBLIC_`.
- Keep `.env.example` free of real credentials.
- Configure production secrets through the hosting provider's environment settings.
- Rotate any credential that has accidentally been exposed.

---

# 15. Supabase Setup & Database

Supabase is the persistence and authentication foundation of VESH.

## 15.1 Create a Project

1. Create a Supabase account.
2. Create a new project.
3. Select a suitable region.
4. Configure a strong database password.
5. Wait for the database to become available.

## 15.2 Configure Application Credentials

From the Supabase project settings, obtain:

- Project URL.
- Public anonymous key.

Add them to `.env.local`.

Use only the public client credential in browser-accessible configuration. Never expose a service-role key in client-side code.

## 15.3 Apply Database Migrations

VESH uses SQL migrations stored in:

```text
supabase/migrations/
```

Apply every migration in ascending filename order.

Do not skip migrations or apply them in an arbitrary order.

Migrations are part of the application contract: the application may rely on tables, indexes, policies, and database functions created by them.

## 15.4 Row Level Security

Row Level Security (RLS) is essential.

It ensures that authenticated users can access only the data permitted by the relevant database policies.

Before production release, verify:

- RLS is enabled on user-owned tables.
- Read operations are user-scoped.
- Insert operations assign the correct user ownership.
- Update operations cannot modify another user's records.
- Delete operations are correctly restricted.
- Public sharing policies expose only the intended public information.

## 15.5 Rate Limiting

The application uses database-backed rate limiting for supported APIs.

The rate-limit migrations are required for the corresponding functionality.

Do not remove or bypass rate-limiting protections when deploying.

## 15.6 Public Streak Sharing

The public streak-sharing functionality is intentionally limited.

The November 12 migration adds opt-in public streak sharing. It creates a public page that exposes the streak snapshot and total check-in count, without exposing account identity, tasks, notes, or conversations.

Users must be able to revoke sharing.

---

# 16. Authentication & Security

Security is a core requirement for a persistent personal AI environment.

### Authentication

- Users authenticate through Supabase Auth.
- Protected functionality requires authenticated access.
- API routes validate the authenticated user.
- User-specific data is scoped to the appropriate account.

### Data isolation

- Database access relies on RLS.
- Mutations are scoped to the authenticated user's ID.
- Public sharing is deliberately restricted.
- Private user data should not be exposed through public endpoints.

### API security

- Provider credentials remain server-side.
- API routes validate incoming requests.
- Supported endpoints use rate limiting.
- Audio requests have size and content-type checks.
- External provider calls use bounded timeouts where implemented.

### Production security checklist

- [ ] `.env.local` is not committed.
- [ ] No private API key is exposed in frontend code.
- [ ] Supabase RLS is enabled.
- [ ] Database migrations are applied.
- [ ] Authentication redirects use the correct production URL.
- [ ] User isolation is tested with separate accounts.
- [ ] Public sharing is tested for data leakage.
- [ ] API rate limits are active.
- [ ] Provider credentials are stored securely.

---

# 17. Running VESH Locally

## Development

```bash
npm run dev
```

## TypeScript Validation

```bash
npm run typecheck
```

## Linting

```bash
npm run lint
```

## Tests

```bash
npm test
```

## Production Build

```bash
npm run build
```

## Production Server

After a successful production build:

```bash
npm run start
```

The production server runs the compiled Next.js application.

---

# 18. Testing & Quality Assurance

VESH uses automated checks to reduce regressions and validate the application before release.

### Verification commands

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

All four commands should pass before a release.

### Functional testing

In addition to automated tests, manually verify:

**Authentication**
- Sign-up.
- Login.
- Logout.
- Session persistence.
- Protected route access.

**Companion**
- Ambient environment loads.
- Companion renders correctly.
- Scene selection works.
- Responsive layout works.

**AI**
- Text conversations work.
- Multi-turn conversations work.
- Conversation history persists as intended.

**Voice**
- Speech transcription works.
- Hindi and English are tested.
- Provider fallback is tested.
- Speech output works.
- Playback interruption behaves correctly.
- Text fallback remains usable.

**Workspace**
- Notes.
- Tasks.
- Calendar events.
- Entities and projects.
- Consistency tracking.

**Security**
- Separate accounts cannot access each other's private data.
- Public sharing exposes only approved fields.
- Revoked sharing links no longer provide access.

**Production**
- API integrations work from the deployed environment.
- Environment variables are correct.
- Authentication redirects work.
- External service quotas and regional availability are verified.

---

# 19. Production Deployment

VESH is designed to run as a hosted application rather than depending on a developer's local machine.

A suitable deployment target is Vercel or another platform that supports the deployed Next.js application and its server-side routes.

## 19.1 Deployment Preparation

Before deployment:

1. Ensure the project builds successfully.
2. Confirm all tests pass.
3. Apply all Supabase migrations.
4. Configure authentication redirect URLs.
5. Verify provider credentials.
6. Confirm `.env.local` is excluded from Git.
7. Review the repository for accidental secrets.

## 19.2 Deploy to Vercel

1. Push the project to GitHub.
2. Sign in to Vercel.
3. Import the VESH GitHub repository.
4. Select the appropriate Next.js project settings.
5. Add the required environment variables.
6. Deploy the application.
7. Wait for the production deployment to finish.

## 19.3 Production Environment Variables

Set the same required variables used locally, but use production values.

For example:

```env
NEXT_PUBLIC_SITE_URL=https://your-vesh-domain.com
```

Use the actual production domain.

Do not copy a local URL into the production configuration.

## 19.4 Supabase Authentication Redirects

Configure the Supabase authentication URL settings to include:

- The production site URL.
- The required production authentication callback or redirect URLs.
- Local development URLs where appropriate.

Ensure these URLs match the application's actual authentication flow.

## 19.5 Post-deployment Verification

After deployment, verify:

- Application loads without errors.
- Sign-up and login work.
- Authenticated pages load.
- AI requests work.
- Voice transcription works.
- Speech output works.
- Workspace data persists.
- Public sharing behaves correctly.
- User data remains isolated.
- No server-side environment variable is missing.

A successful deployment does not automatically mean every external integration is operational. Each integration must be smoke-tested in the deployed environment.

---

# 20. Current Limitations & Considerations

VESH V1.0 establishes the core product experience, but several areas can benefit from additional engineering.

### AI intelligence

- Memory retrieval can become more selective and relevant.
- Long conversations may require better context management.
- More sophisticated personalization can be introduced.
- Tool orchestration can become more capable.

### Voice

- Transcription accuracy may vary by language, accent, and background noise.
- External providers can experience quota or regional availability issues.
- Response latency depends on network and provider performance.
- Natural turn-taking and interruption handling can be refined.

### Productivity

- Workspace automation can be expanded.
- Calendar synchronization can be improved.
- Reminders and recurring workflows can be introduced.
- AI-assisted planning can be developed.

### Infrastructure

- Monitoring and structured observability can be expanded.
- Background jobs may be required for future workflows.
- Caching and performance optimization can be introduced where appropriate.
- Database indexing and query performance should be monitored as usage grows.

These are refinement opportunities, not reasons to compromise the stable V1.0 release.

---

# 21. V1.0 Release Scope

V1.0 is the initial integrated release of VESH.

Its objective is to deliver a working, deployable foundation.

| Area | V1.0 objective |
|---|---|
| Ambient environment | Interactive companion experience |
| Companion | Animated digital presence |
| Scenes | Selectable ambient environments |
| AI | Conversational assistance |
| Voice input | Speech transcription |
| Voice output | Speech synthesis |
| Accounts | Authenticated user access |
| Conversations | Persistent conversation functionality |
| Memory | Persistent contextual data foundation |
| Workspace | Notes, tasks, calendar and structured information |
| Time utilities | Clock, timer, stopwatch and world clock |
| Consistency | Daily check-in tracking |
| Sharing | Optional public streak sharing |
| Web search | Optional live search integration |
| Database | Supabase-backed persistence |
| Security | Authenticated APIs and RLS-based isolation |

### V1.0 release philosophy

The goal is not to make V1.0 contain every possible AI feature.

The goal is to establish a stable product with a clear identity, integrated functionality, reliable data handling, and a foundation that can be extended without rewriting the application.

**V1.0 scope should remain frozen after release except for critical bug fixes and security issues.**

---

# 22. V1.1 — Refinement & Intelligence

V1.1 should focus on making the existing VESH experience more reliable, intelligent, and polished.

It should improve the quality of existing capabilities rather than dramatically expanding the product surface.

## 22.1 Voice Experience Refinement

Potential improvements:

- More accurate Hindi and Hinglish transcription.
- Better language detection.
- Improved noise handling.
- Lower speech-to-text latency.
- More natural speech synthesis.
- Better turn-taking.
- More reliable interruption handling.
- Improved voice-session state management.
- Better handling of provider failures.
- Consistent companion voice configuration.

## 22.2 Memory Intelligence

Improve how VESH remembers and retrieves information.

Potential improvements:

- Automatic extraction of useful memories.
- Memory categorization.
- Relevance-based retrieval.
- Duplicate memory detection.
- Memory updates and conflict resolution.
- User-facing memory management.
- Better short-term versus long-term memory separation.

## 22.3 Contextual AI

Make the assistant more aware of its existing workspace data.

Potential improvements:

- Reference tasks during conversations.
- Use project context in relevant responses.
- Retrieve relevant notes.
- Provide better contextual summaries.
- Understand ongoing user activities.
- Improve conversation continuity.

## 22.4 Workspace Refinement

Potential improvements:

- Task priorities.
- Better task organization.
- Recurring tasks.
- Improved calendar interactions.
- Better project views.
- Workspace-wide search.
- More useful productivity summaries.

## 22.5 User Experience

Potential improvements:

- More polished animations.
- Better responsive behavior.
- Faster navigation.
- Improved loading and error states.
- Better accessibility.
- More consistent interaction feedback.
- Reduced visual clutter.

## 22.6 Reliability & Observability

Potential improvements:

- Structured server-side logging.
- Error monitoring.
- AI and speech provider latency tracking.
- Better failure reporting.
- API performance monitoring.
- Improved test coverage.
- Database query optimization.

### V1.1 success criteria

- Existing V1 functionality remains stable.
- Voice interactions become more dependable.
- Memory retrieval becomes more useful.
- Workspace and conversation context work together more effectively.
- Production issues become easier to diagnose.

---

# 23. V2.0 — The Next Evolution

V2.0 should move VESH from an integrated ambient AI companion toward a more proactive, context-aware personal AI environment.

The focus should shift from simply responding to user requests toward helping users manage ongoing activities and workflows.

The following items are proposed roadmap directions, not current V1.0 functionality.

## 23.1 Proactive AI Companion

Evolve VESH from a primarily reactive assistant into a more proactive companion.

Potential capabilities:

- Context-aware suggestions.
- Daily briefings.
- Personalized summaries.
- Follow-up suggestions.
- Awareness of upcoming tasks and events.
- User-approved reminders.
- Progress-based recommendations.
- Contextual assistance based on active projects.

Proactive behavior must remain transparent and user-controlled.

## 23.2 Advanced Memory Architecture

Develop a more capable memory system.

Potential capabilities:

- Semantic memory retrieval.
- Vector search.
- Memory relevance ranking.
- Long-term contextual memory.
- Episodic memory.
- Structured user preferences.
- Memory lifecycle management.
- User review and correction.
- Conflict resolution between old and new information.

The objective is to make VESH better at recalling relevant information without overwhelming conversations with irrelevant context.

## 23.3 AI Tool Orchestration

Allow VESH to perform multi-step workflows through explicitly supported tools.

Potential capabilities:

- Create tasks from conversations.
- Organize notes.
- Summarize projects.
- Prepare daily plans.
- Update supported workspace records.
- Search relevant stored information.
- Coordinate multiple actions.
- Ask for confirmation before consequential operations.

The assistant should clearly distinguish between suggesting an action and successfully completing it.

## 23.4 Advanced Voice Architecture

Evolve voice interaction into a more natural conversational experience.

Potential capabilities:

- More reliable wake-word activation.
- Improved voice activity detection.
- Better endpoint detection.
- Streaming speech recognition.
- Streaming speech synthesis.
- Low-latency conversational responses.
- Natural interruption and resumption.
- Better bilingual Hindi-English handling.
- More expressive voice characteristics.
- Improved audio session management.

A central V2 goal is to make voice interaction feel continuous without making the application unnecessarily intrusive.

## 23.5 Personalized Ambient Environment

Expand the ambient experience.

Potential capabilities:

- More environmental scenes.
- Scene transitions.
- Time-aware environment changes.
- Weather-aware scenes.
- Personalized atmosphere settings.
- Improved companion animations.
- More expressive companion states.
- Context-aware visual feedback.

The environment should reinforce the companion's presence without becoming distracting.

## 23.6 Calendar & External Integrations

Potential integrations:

- Google Calendar.
- Microsoft Outlook Calendar.
- External task systems.
- Email integrations.
- Cloud storage.
- Other user-approved productivity services.

Integrations should use secure authorization and explicit user permissions.

## 23.7 Advanced Productivity Intelligence

Potential capabilities:

- AI-generated daily plans.
- Task prioritization.
- Schedule optimization.
- Project progress summaries.
- Deadline awareness.
- Habit insights.
- Consistency analytics.
- Natural-language workspace queries.
- Cross-module productivity recommendations.

## 23.8 Notifications & Reminders

Potential capabilities:

- Contextual reminders.
- Scheduled notifications.
- Task deadline notifications.
- Calendar event reminders.
- User-configurable notification preferences.
- Quiet hours.
- Notification delivery controls.

## 23.9 Scalable Infrastructure

As VESH grows, its architecture may evolve to include:

- Background job processing.
- Queue-based operations.
- Caching.
- More advanced observability.
- Better database performance.
- Usage analytics.
- Cost monitoring.
- Resilient external provider handling.
- Improved deployment and rollback workflows.

### V2.0 success criteria

V2.0 should make VESH feel more like a capable personal AI environment than a collection of separate features.

It should:

1. Understand relevant user context.
2. Remember useful information reliably.
3. Assist with multi-step workflows.
4. Support natural, low-latency voice conversations.
5. Help users manage their daily activities.
6. Operate reliably across sessions and devices.
7. Keep user control, privacy, and transparency central.

---

# 24. Long-Term Vision

Beyond V2.0, VESH can evolve into a persistent personal AI environment.

Potential long-term directions include:

### Personal AI Agent

An assistant capable of managing user-approved workflows across supported applications.

### Multimodal Interaction

More natural interaction through voice, text, images, documents, and other supported inputs.

### Adaptive Companion

A companion whose interface and assistance adapt to the user's context and preferences.

### Cross-device Continuity

A consistent experience across desktop, mobile, and other supported devices.

### Personal Knowledge Environment

A unified system for conversations, notes, documents, projects, and useful memories.

### Ambient Computing

A more natural interface where assistance is available in the environment rather than restricted to a conventional chat window.

The long-term objective is to build a useful, trustworthy, and persistent personal AI environment.

---

# 25. Development Principles

VESH development follows several principles.

### 25.1 Preserve the Core Experience

The ambient companion experience is central to the product identity.

New features should enhance it rather than turn VESH into an unrelated collection of tools.

### 25.2 Reliability Before Feature Count

A small set of reliable capabilities is more valuable than a large collection of unstable features.

### 25.3 Privacy by Design

User data must remain protected through authentication, authorization, and database-level access control.

### 25.4 Modular Architecture

New functionality should be introduced through clear modules and well-defined interfaces.

### 25.5 Graceful Degradation

When an external provider is unavailable, the application should communicate the limitation and preserve alternative interaction paths where possible.

### 25.6 User Control

Memory, sharing, notifications, and future automated actions should remain transparent and appropriately controlled by the user.

### 25.7 Incremental Evolution

V1.0 establishes the foundation. V1.1 improves quality. V2.0 expands intelligence and capability.

---

# 26. Contributing

Contributions and suggestions are welcome.

For substantial changes:

1. Understand the existing feature architecture.
2. Avoid unnecessary changes to stable V1 functionality.
3. Keep secrets and credentials out of source control.
4. Follow the existing TypeScript and project conventions.
5. Add or update tests where appropriate.
6. Run the complete verification suite.
7. Document changes that affect configuration or deployment.

Suggested development workflow:

```bash
git checkout -b feature/your-feature-name

npm ci
npm run typecheck
npm run lint
npm test
npm run build

git add .
git commit -m "feat: describe your change"
```

---

# 27. License

A license has not been specified in this repository.

Until a license is added, all rights are reserved by the copyright holder. Do not assume that the source code, assets, or models are available for unrestricted reuse.

---

## Final Note

VESH is an evolving project built around a simple idea:

**AI should not only be something you open when you need an answer. It should be an environment that helps you think, organize, remember, and move forward.**

V1.0 establishes the foundation.

V1.1 makes the experience more refined and intelligent.

V2.0 moves toward a proactive, context-aware personal AI environment.

**VESH — More than a conversation. A companion environment.**